import { and, count, eq, ilike } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/drizzle";
import { roles, session, user, userProfiles } from "../db/schema";
import {
  assignRolesToUser,
  ensureAccessControlSeed,
  getRoleIdsByCodes,
  isOnlySuperAdmin,
  requirePermission,
} from "../lib/access-control";
import { auth } from "../lib/auth";

const userTypeSchema = t.UnionEnum(["admin", "staff"] as const);
const userStatusSchema = t.UnionEnum(["active", "inactive", "suspended"] as const);

const createUserSchema = t.Object({
  name: t.String({ minLength: 2 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8 }),
  image: t.Optional(t.String({ format: "uri" })),
  userType: t.Optional(userTypeSchema),
  status: t.Optional(userStatusSchema),
  phoneNumber: t.Optional(t.String({ minLength: 7 })),
  employeeId: t.Optional(t.String({ minLength: 1 })),
  jobTitle: t.Optional(t.String({ minLength: 1 })),
  department: t.Optional(t.String({ minLength: 1 })),
  address: t.Optional(t.String({ minLength: 1 })),
  notes: t.Optional(t.String({ minLength: 1 })),
  roleCodes: t.Optional(t.Array(t.String({ minLength: 1 }))),
});

const updateUserSchema = t.Object({
  name: t.Optional(t.String({ minLength: 2 })),
  email: t.Optional(t.String({ format: "email" })),
  image: t.Optional(t.String({ format: "uri" })),
  userType: t.Optional(userTypeSchema),
  status: t.Optional(userStatusSchema),
  phoneNumber: t.Optional(t.String({ minLength: 7 })),
  employeeId: t.Optional(t.String({ minLength: 1 })),
  jobTitle: t.Optional(t.String({ minLength: 1 })),
  department: t.Optional(t.String({ minLength: 1 })),
  address: t.Optional(t.String({ minLength: 1 })),
  notes: t.Optional(t.String({ minLength: 1 })),
  roleCodes: t.Optional(t.Array(t.String({ minLength: 1 }))),
});

const listUsersQuerySchema = t.Object({
  q: t.Optional(t.String()),
  userType: t.Optional(userTypeSchema),
  status: t.Optional(userStatusSchema),
});

const userParamsSchema = t.Object({
  id: t.String(),
});

const messageResponseSchema = t.Object({
  message: t.String(),
});

const validationErrorResponseSchema = t.Object({
  message: t.String(),
  issues: t.Any(),
});

const roleSchema = t.Object({
  id: t.String(),
  name: t.String(),
  code: t.String(),
  description: t.Nullable(t.String()),
  isSystem: t.Boolean(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const userProfileSchema = t.Union([
  t.Object({
    id: t.String({ format: "uuid" }),
    userId: t.String(),
    employeeId: t.Nullable(t.String()),
    jobTitle: t.Nullable(t.String()),
    department: t.Nullable(t.String()),
    address: t.Nullable(t.String()),
    notes: t.Nullable(t.String()),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  }),
  t.Null(),
]);

const userRoleAssignmentSchema = t.Object({
  id: t.String(),
  name: t.String(),
  code: t.String(),
  description: t.Nullable(t.String()),
});

const userRecordSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  emailVerified: t.Boolean(),
  image: t.Nullable(t.String()),
  userType: userTypeSchema,
  status: userStatusSchema,
  phoneNumber: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  profile: userProfileSchema,
  roles: t.Array(userRoleAssignmentSchema),
  permissions: t.Array(t.String()),
});

const userListItemSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  emailVerified: t.Boolean(),
  image: t.Nullable(t.String()),
  userType: userTypeSchema,
  status: userStatusSchema,
  phoneNumber: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  profile: userProfileSchema,
  roles: t.Array(roleSchema),
});

const rolesResponseSchema = t.Object({
  data: t.Array(roleSchema),
});

const userListResponseSchema = t.Object({
  data: t.Array(userListItemSchema),
});

const userRecordResponseSchema = t.Object({
  data: userRecordSchema,
});

const serializeUser = async (userId: string) => {
  const record = await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      profile: true,
      userRoles: {
        with: {
          role: {
            with: {
              rolePermissions: {
                with: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!record) {
    return null;
  }

  const permissions = new Set<string>();

  for (const assignment of record.userRoles) {
    for (const rolePermission of assignment.role.rolePermissions) {
      permissions.add(rolePermission.permission.code);
    }
  }

  return {
    id: record.id,
    name: record.name,
    email: record.email,
    emailVerified: record.emailVerified,
    image: record.image,
    userType: record.userType,
    status: record.status,
    phoneNumber: record.phoneNumber,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    profile: record.profile,
    roles: record.userRoles.map((assignment) => ({
      id: assignment.role.id,
      name: assignment.role.name,
      code: assignment.role.code,
      description: assignment.role.description,
    })),
    permissions: [...permissions],
  };
};

export const usersApp = new Elysia({ prefix: "/api/admin" })
  .get(
    "/roles",
    async ({ request, set }) => {
      try {
        await requirePermission(request.headers, "users.read");
        const availableRoles = await db.select().from(roles);

        return {
          data: availableRoles,
        };
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          set.status = 401;
          return { message: "Authentication required" };
        }

        set.status = 403;
        return { message: "Insufficient permissions" };
      }
    },
    {
      detail: {
        tags: ["Users"],
        summary: "List available roles",
      },
      response: {
        200: rolesResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
      },
    },
  )
  .get(
    "/users",
    async ({ query, request, set }) => {
      try {
        await requirePermission(request.headers, "users.read");
        const conditions = [];

        if (query.q) {
          conditions.push(ilike(user.name, `%${query.q}%`));
        }

        if (query.userType) {
          conditions.push(eq(user.userType, query.userType));
        }

        if (query.status) {
          conditions.push(eq(user.status, query.status));
        }

        const records = await db.query.user.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          with: {
            profile: true,
            userRoles: {
              with: {
                role: true,
              },
            },
          },
          orderBy: (table, { desc }) => [desc(table.createdAt)],
        });

        return {
          data: records.map((record) => ({
            id: record.id,
            name: record.name,
            email: record.email,
            emailVerified: record.emailVerified,
            image: record.image,
            userType: record.userType,
            status: record.status,
            phoneNumber: record.phoneNumber,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            profile: record.profile,
            roles: record.userRoles.map((assignment) => assignment.role),
          })),
        };
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          set.status = 401;
          return { message: "Authentication required" };
        }

        set.status = 403;
        return { message: "Insufficient permissions" };
      }
    },
    {
      query: listUsersQuerySchema,
      detail: {
        tags: ["Users"],
        summary: "List users",
      },
      response: {
        200: userListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
      },
    },
  )
  .get(
    "/users/:id",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "users.read");
        const record = await serializeUser(params.id);

        if (!record) {
          set.status = 404;
          return { message: "User not found" };
        }

        return {
          data: record,
        };
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          set.status = 401;
          return { message: "Authentication required" };
        }

        set.status = 403;
        return { message: "Insufficient permissions" };
      }
    },
    {
      params: userParamsSchema,
      detail: {
        tags: ["Users"],
        summary: "Get user",
      },
      response: {
        200: userRecordResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .post(
    "/users/bootstrap",
    async ({ body, set }) => {
      try {
        await ensureAccessControlSeed();

        const [existingUserCount] = await db.select({ value: count() }).from(user);

        if ((existingUserCount?.value ?? 0) > 0) {
          set.status = 409;
          return { message: "Bootstrap is only available before the first user exists" };
        }

        const superAdminRole = await getRoleIdsByCodes(["super_admin"]);
        const created = await auth.api.signUpEmail({
          body: {
            name: body.name,
            email: body.email,
            password: body.password,
            image: body.image,
            userType: "admin",
            status: "active",
            phoneNumber: body.phoneNumber,
          },
        });

        if (!created?.user?.id) {
          set.status = 500;
          return { message: "Failed to create bootstrap user" };
        }

        await db.insert(userProfiles).values({
          userId: created.user.id,
          employeeId: body.employeeId,
          jobTitle: body.jobTitle,
          department: body.department,
          address: body.address,
          notes: body.notes,
        });

        await assignRolesToUser(
          created.user.id,
          superAdminRole.map((role) => role.id),
        );

        await db.delete(session).where(eq(session.userId, created.user.id));

        set.status = 201;
        return {
          data: await serializeUser(created.user.id),
        };
      } catch (error) {
        set.status = 500;
        return {
          message: error instanceof Error ? error.message : "Failed to bootstrap user",
        };
      }
    },
    {
      body: createUserSchema,
      detail: {
        tags: ["Users"],
        summary: "Bootstrap first super admin user",
      },
      response: {
        201: userRecordResponseSchema,
        400: validationErrorResponseSchema,
        409: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .post(
    "/users",
    async ({ body, request, set }) => {
      try {
        await ensureAccessControlSeed();
        await requirePermission(request.headers, "users.create");

        const roleCodes = body.roleCodes ?? [];
        const selectedRoles = await getRoleIdsByCodes(roleCodes);

        if (selectedRoles.length !== roleCodes.length) {
          set.status = 400;
          return { message: "One or more roles are invalid" };
        }

        const created = await auth.api.signUpEmail({
          body: {
            name: body.name,
            email: body.email,
            password: body.password,
            image: body.image,
            userType: body.userType ?? "staff",
            status: body.status ?? "active",
            phoneNumber: body.phoneNumber,
          },
        });

        if (!created?.user?.id) {
          set.status = 500;
          return { message: "Failed to create user" };
        }

        await db.insert(userProfiles).values({
          userId: created.user.id,
          employeeId: body.employeeId,
          jobTitle: body.jobTitle,
          department: body.department,
          address: body.address,
          notes: body.notes,
        });

        await assignRolesToUser(
          created.user.id,
          selectedRoles.map((role) => role.id),
        );

        await db.delete(session).where(eq(session.userId, created.user.id));

        set.status = 201;
        return {
          data: await serializeUser(created.user.id),
        };
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          set.status = 401;
          return { message: "Authentication required" };
        }

        if (error instanceof Error && error.message === "FORBIDDEN") {
          set.status = 403;
          return { message: "Insufficient permissions" };
        }

        set.status = 500;
        return {
          message: error instanceof Error ? error.message : "Failed to create user",
        };
      }
    },
    {
      body: createUserSchema,
      detail: {
        tags: ["Users"],
        summary: "Create user",
      },
      response: {
        201: userRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/users/:id",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "users.update");

        const existing = await db.query.user.findFirst({
          where: eq(user.id, params.id),
          with: {
            profile: true,
          },
        });

        if (!existing) {
          set.status = 404;
          return { message: "User not found" };
        }

        if (body.roleCodes) {
          await requirePermission(request.headers, "roles.assign");
        }

        await db
          .update(user)
          .set({
            name: body.name ?? existing.name,
            email: body.email ?? existing.email,
            image: body.image ?? existing.image,
            userType: body.userType ?? existing.userType,
            status: body.status ?? existing.status,
            phoneNumber: body.phoneNumber ?? existing.phoneNumber,
            updatedAt: new Date(),
          })
          .where(eq(user.id, params.id));

        if (existing.profile) {
          await db
            .update(userProfiles)
            .set({
              employeeId: body.employeeId ?? existing.profile.employeeId,
              jobTitle: body.jobTitle ?? existing.profile.jobTitle,
              department: body.department ?? existing.profile.department,
              address: body.address ?? existing.profile.address,
              notes: body.notes ?? existing.profile.notes,
              updatedAt: new Date(),
            })
            .where(eq(userProfiles.userId, params.id));
        } else if (
          body.employeeId ||
          body.jobTitle ||
          body.department ||
          body.address ||
          body.notes
        ) {
          await db.insert(userProfiles).values({
            userId: params.id,
            employeeId: body.employeeId,
            jobTitle: body.jobTitle,
            department: body.department,
            address: body.address,
            notes: body.notes,
          });
        }

        if (body.roleCodes) {
          const selectedRoles = await getRoleIdsByCodes(body.roleCodes);

          if (selectedRoles.length !== body.roleCodes.length) {
            set.status = 400;
            return { message: "One or more roles are invalid" };
          }

          await assignRolesToUser(
            params.id,
            selectedRoles.map((role) => role.id),
          );
        }

        const updatedUser = await serializeUser(params.id);

        if (!updatedUser) {
          set.status = 500;
          return { message: "Failed to load updated user" };
        }

        return {
          data: updatedUser,
        };
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          set.status = 401;
          return { message: "Authentication required" };
        }

        if (error instanceof Error && error.message === "FORBIDDEN") {
          set.status = 403;
          return { message: "Insufficient permissions" };
        }

        set.status = 500;
        return {
          message: error instanceof Error ? error.message : "Failed to update user",
        };
      }
    },
    {
      params: userParamsSchema,
      body: updateUserSchema,
      detail: {
        tags: ["Users"],
        summary: "Update user",
      },
      response: {
        200: userRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .delete(
    "/users/:id",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "users.delete");

        const existing = await db.query.user.findFirst({
          where: eq(user.id, params.id),
        });

        if (!existing) {
          set.status = 404;
          return { message: "User not found" };
        }

        if (await isOnlySuperAdmin(params.id)) {
          set.status = 409;
          return { message: "You cannot delete the only super admin account" };
        }

        await db.delete(user).where(eq(user.id, params.id));

        return {
          message: "User deleted successfully",
        };
      } catch (error) {
        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          set.status = 401;
          return { message: "Authentication required" };
        }

        if (error instanceof Error && error.message === "FORBIDDEN") {
          set.status = 403;
          return { message: "Insufficient permissions" };
        }

        set.status = 500;
        return {
          message: error instanceof Error ? error.message : "Failed to delete user",
        };
      }
    },
    {
      params: userParamsSchema,
      detail: {
        tags: ["Users"],
        summary: "Delete user",
      },
      response: {
        200: messageResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        409: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  );
