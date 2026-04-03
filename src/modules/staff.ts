import { and, desc, eq, ilike } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/drizzle";
import {
  roles,
  session,
  staffPerformanceReviews,
  staffShifts,
  user,
  userProfiles,
} from "../db/schema";
import {
  assignRolesToUser,
  getRoleIdsByCodes,
  requirePermission,
} from "../lib/access-control";
import { auth } from "../lib/auth";

const shiftStatusSchema = t.UnionEnum(
  ["scheduled", "completed", "missed", "cancelled"] as const,
);
const performanceRatingSchema = t.UnionEnum(
  ["poor", "fair", "good", "very_good", "excellent"] as const,
);

const staffRoleSchema = t.Object({
  id: t.String(),
  name: t.String(),
  code: t.String(),
  description: t.Nullable(t.String()),
});

const staffProfileSchema = t.Union([
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

const staffShiftSchema = t.Object({
  id: t.String({ format: "uuid" }),
  staffUserId: t.String(),
  shiftDate: t.String(),
  startTime: t.String(),
  endTime: t.String(),
  department: t.Nullable(t.String()),
  roleLabel: t.Nullable(t.String()),
  status: shiftStatusSchema,
  notes: t.Nullable(t.String()),
  assignedBy: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const staffReviewSchema = t.Object({
  id: t.String({ format: "uuid" }),
  staffUserId: t.String(),
  reviewerUserId: t.Nullable(t.String()),
  reviewDate: t.String(),
  rating: performanceRatingSchema,
  strengths: t.Nullable(t.String()),
  improvements: t.Nullable(t.String()),
  summary: t.Nullable(t.String()),
  notes: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const staffRecordSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  emailVerified: t.Boolean(),
  image: t.Nullable(t.String()),
  userType: t.UnionEnum(["admin", "staff"] as const),
  status: t.UnionEnum(["active", "inactive", "suspended"] as const),
  phoneNumber: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  profile: staffProfileSchema,
  roles: t.Array(staffRoleSchema),
  shifts: t.Array(staffShiftSchema),
  performanceReviews: t.Array(staffReviewSchema),
});

const listStaffQuerySchema = t.Object({
  q: t.Optional(t.String()),
  status: t.Optional(t.UnionEnum(["active", "inactive", "suspended"] as const)),
  department: t.Optional(t.String()),
});

const staffParamsSchema = t.Object({
  id: t.String(),
});

const shiftParamsSchema = t.Object({
  shiftId: t.String({ format: "uuid" }),
});

const createStaffSchema = t.Object({
  name: t.String({ minLength: 2 }),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8 }),
  image: t.Optional(t.String({ format: "uri" })),
  status: t.Optional(t.UnionEnum(["active", "inactive", "suspended"] as const)),
  phoneNumber: t.Optional(t.String({ minLength: 7 })),
  employeeId: t.Optional(t.String({ minLength: 1 })),
  jobTitle: t.Optional(t.String({ minLength: 1 })),
  department: t.Optional(t.String({ minLength: 1 })),
  address: t.Optional(t.String({ minLength: 1 })),
  notes: t.Optional(t.String({ minLength: 1 })),
  roleCodes: t.Optional(t.Array(t.String({ minLength: 1 }))),
});

const updateStaffSchema = t.Object({
  name: t.Optional(t.String({ minLength: 2 })),
  email: t.Optional(t.String({ format: "email" })),
  image: t.Optional(t.String({ format: "uri" })),
  status: t.Optional(t.UnionEnum(["active", "inactive", "suspended"] as const)),
  phoneNumber: t.Optional(t.String({ minLength: 7 })),
  employeeId: t.Optional(t.String({ minLength: 1 })),
  jobTitle: t.Optional(t.String({ minLength: 1 })),
  department: t.Optional(t.String({ minLength: 1 })),
  address: t.Optional(t.String({ minLength: 1 })),
  notes: t.Optional(t.String({ minLength: 1 })),
  roleCodes: t.Optional(t.Array(t.String({ minLength: 1 }))),
});

const createShiftSchema = t.Object({
  shiftDate: t.String({ format: "date" }),
  startTime: t.String({ minLength: 1, maxLength: 10 }),
  endTime: t.String({ minLength: 1, maxLength: 10 }),
  department: t.Optional(t.String({ minLength: 1 })),
  roleLabel: t.Optional(t.String({ minLength: 1 })),
  status: t.Optional(shiftStatusSchema),
  notes: t.Optional(t.String()),
});

const updateShiftSchema = t.Object({
  shiftDate: t.Optional(t.String({ format: "date" })),
  startTime: t.Optional(t.String({ minLength: 1, maxLength: 10 })),
  endTime: t.Optional(t.String({ minLength: 1, maxLength: 10 })),
  department: t.Optional(t.String({ minLength: 1 })),
  roleLabel: t.Optional(t.String({ minLength: 1 })),
  status: t.Optional(shiftStatusSchema),
  notes: t.Optional(t.String()),
});

const createReviewSchema = t.Object({
  reviewDate: t.String({ format: "date" }),
  rating: performanceRatingSchema,
  strengths: t.Optional(t.String()),
  improvements: t.Optional(t.String()),
  summary: t.Optional(t.String()),
  notes: t.Optional(t.String()),
});

const messageResponseSchema = t.Object({
  message: t.String(),
});

const validationErrorResponseSchema = t.Object({
  message: t.String(),
  issues: t.Any(),
});

const staffRecordResponseSchema = t.Object({
  data: staffRecordSchema,
});

const staffListResponseSchema = t.Object({
  data: t.Array(staffRecordSchema),
});

const shiftListResponseSchema = t.Object({
  data: t.Array(staffShiftSchema),
});

const reviewListResponseSchema = t.Object({
  data: t.Array(staffReviewSchema),
});

const generateEmployeeId = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomChunk = Math.floor(Math.random() * 900000 + 100000).toString();
    const candidate = `AHS-${year}${randomChunk}`;
    const exists = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.employeeId, candidate),
      columns: {
        id: true,
      },
    });

    if (!exists) {
      return candidate;
    }
  }

  return `AHS-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
};

const serializeStaff = async (userId: string) => {
  const record = await db.query.user.findFirst({
    where: and(eq(user.id, userId), eq(user.userType, "staff")),
    with: {
      profile: true,
      userRoles: {
        with: {
          role: true,
        },
      },
      staffShifts: true,
      staffPerformanceReviews: true,
    },
  });

  if (!record) {
    return null;
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
    shifts: record.staffShifts,
    performanceReviews: record.staffPerformanceReviews,
  };
};

export const staffApp = new Elysia({ prefix: "/api/admin/staff" })
  .get(
    "/",
    async ({ query, request, set }) => {
      try {
        await requirePermission(request.headers, "staff.read");
        const conditions = [eq(user.userType, "staff" as const)];

        if (query.q) {
          conditions.push(ilike(user.name, `%${query.q}%`));
        }

        if (query.status) {
          conditions.push(eq(user.status, query.status));
        }

        if (query.department) {
          const records = await db.query.user.findMany({
            where: and(...conditions),
            with: {
              profile: true,
              userRoles: { with: { role: true } },
              staffShifts: true,
              staffPerformanceReviews: true,
            },
            orderBy: (table, { desc }) => [desc(table.createdAt)],
          });

          return {
            data: records
              .filter((record) => record.profile?.department === query.department)
              .map((record) => ({
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
                shifts: record.staffShifts,
                performanceReviews: record.staffPerformanceReviews,
              })),
          };
        }

        const records = await db.query.user.findMany({
          where: and(...conditions),
          with: {
            profile: true,
            userRoles: { with: { role: true } },
            staffShifts: true,
            staffPerformanceReviews: true,
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
            roles: record.userRoles.map((assignment) => ({
              id: assignment.role.id,
              name: assignment.role.name,
              code: assignment.role.code,
              description: assignment.role.description,
            })),
            shifts: record.staffShifts,
            performanceReviews: record.staffPerformanceReviews,
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
      query: listStaffQuerySchema,
      detail: {
        tags: ["Staff"],
        summary: "List staff",
      },
      response: {
        200: staffListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "staff.read");
        const record = await serializeStaff(params.id);

        if (!record) {
          set.status = 404;
          return { message: "Staff user not found" };
        }

        return { data: record };
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
      params: staffParamsSchema,
      detail: {
        tags: ["Staff"],
        summary: "Get staff profile",
      },
      response: {
        200: staffRecordResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .post(
    "/",
    async ({ body, request, set }) => {
      try {
        await requirePermission(request.headers, "staff.create");
        const selectedRoles = await getRoleIdsByCodes(body.roleCodes ?? []);

        if (selectedRoles.length !== (body.roleCodes ?? []).length) {
          set.status = 400;
          return { message: "One or more roles are invalid" };
        }

        const created = await auth.api.signUpEmail({
          body: {
            name: body.name,
            email: body.email,
            password: body.password,
            image: body.image,
            userType: "staff",
            status: body.status ?? "active",
            phoneNumber: body.phoneNumber,
          },
        });

        if (!created?.user?.id) {
          set.status = 500;
          return { message: "Failed to create staff user" };
        }

        const employeeId = await generateEmployeeId();

        await db.insert(userProfiles).values({
          userId: created.user.id,
          employeeId,
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

        const createdStaff = await serializeStaff(created.user.id);

        if (!createdStaff) {
          set.status = 500;
          return { message: "Failed to load created staff user" };
        }

        set.status = 201;
        return { data: createdStaff };
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
          message: error instanceof Error ? error.message : "Failed to create staff user",
        };
      }
    },
    {
      body: createStaffSchema,
      detail: {
        tags: ["Staff"],
        summary: "Create staff user",
      },
      response: {
        201: staffRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "staff.update");
        const existing = await db.query.user.findFirst({
          where: and(eq(user.id, params.id), eq(user.userType, "staff")),
          with: {
            profile: true,
          },
        });

        if (!existing) {
          set.status = 404;
          return { message: "Staff user not found" };
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

        await db
          .update(user)
          .set({
            name: body.name ?? existing.name,
            email: body.email ?? existing.email,
            image: body.image ?? existing.image,
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

        const updatedStaff = await serializeStaff(params.id);

        if (!updatedStaff) {
          set.status = 500;
          return { message: "Failed to load updated staff user" };
        }

        return { data: updatedStaff };
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
          message: error instanceof Error ? error.message : "Failed to update staff user",
        };
      }
    },
    {
      params: staffParamsSchema,
      body: updateStaffSchema,
      detail: {
        tags: ["Staff"],
        summary: "Update staff user",
      },
      response: {
        200: staffRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "staff.delete");
        const existing = await db.query.user.findFirst({
          where: and(eq(user.id, params.id), eq(user.userType, "staff")),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Staff user not found" };
        }

        await db.delete(user).where(eq(user.id, params.id));

        return { message: "Staff user deleted successfully" };
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
          message: error instanceof Error ? error.message : "Failed to delete staff user",
        };
      }
    },
    {
      params: staffParamsSchema,
      detail: {
        tags: ["Staff"],
        summary: "Delete staff user",
      },
      response: {
        200: messageResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .get(
    "/:id/shifts",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "staff.read");
        const existing = await db.query.user.findFirst({
          where: and(eq(user.id, params.id), eq(user.userType, "staff")),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Staff user not found" };
        }

        const shifts = await db.query.staffShifts.findMany({
          where: eq(staffShifts.staffUserId, params.id),
          orderBy: [desc(staffShifts.shiftDate)],
        });

        return { data: shifts };
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
      params: staffParamsSchema,
      detail: {
        tags: ["Staff"],
        summary: "List staff shifts",
      },
      response: {
        200: shiftListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .post(
    "/:id/shifts",
    async ({ params, body, request, set }) => {
      try {
        const authContext = await requirePermission(request.headers, "staff.update");
        const existing = await db.query.user.findFirst({
          where: and(eq(user.id, params.id), eq(user.userType, "staff")),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Staff user not found" };
        }

        const [shift] = await db
          .insert(staffShifts)
          .values({
            staffUserId: params.id,
            shiftDate: body.shiftDate,
            startTime: body.startTime,
            endTime: body.endTime,
            department: body.department,
            roleLabel: body.roleLabel,
            status: body.status ?? "scheduled",
            notes: body.notes,
            assignedBy: authContext.user.id,
          })
          .returning();

        set.status = 201;
        return { data: [shift] };
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
          message: error instanceof Error ? error.message : "Failed to create shift",
        };
      }
    },
    {
      params: staffParamsSchema,
      body: createShiftSchema,
      detail: {
        tags: ["Staff"],
        summary: "Create staff shift",
      },
      response: {
        201: shiftListResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/shifts/:shiftId",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "staff.update");
        const existing = await db.query.staffShifts.findFirst({
          where: eq(staffShifts.id, params.shiftId),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Shift not found" };
        }

        await db
          .update(staffShifts)
          .set({
            shiftDate: body.shiftDate ?? existing.shiftDate,
            startTime: body.startTime ?? existing.startTime,
            endTime: body.endTime ?? existing.endTime,
            department: body.department ?? existing.department,
            roleLabel: body.roleLabel ?? existing.roleLabel,
            status: body.status ?? existing.status,
            notes: body.notes ?? existing.notes,
            updatedAt: new Date(),
          })
          .where(eq(staffShifts.id, params.shiftId));

        const updatedShift = await db.query.staffShifts.findFirst({
          where: eq(staffShifts.id, params.shiftId),
        });

        if (!updatedShift) {
          set.status = 500;
          return { message: "Failed to load updated shift" };
        }

        return { data: [updatedShift] };
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
          message: error instanceof Error ? error.message : "Failed to update shift",
        };
      }
    },
    {
      params: shiftParamsSchema,
      body: updateShiftSchema,
      detail: {
        tags: ["Staff"],
        summary: "Update shift",
      },
      response: {
        200: shiftListResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .get(
    "/:id/performance-reviews",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "staff.read");
        const existing = await db.query.user.findFirst({
          where: and(eq(user.id, params.id), eq(user.userType, "staff")),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Staff user not found" };
        }

        const reviews = await db.query.staffPerformanceReviews.findMany({
          where: eq(staffPerformanceReviews.staffUserId, params.id),
          orderBy: [desc(staffPerformanceReviews.reviewDate)],
        });

        return { data: reviews };
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
      params: staffParamsSchema,
      detail: {
        tags: ["Staff"],
        summary: "List performance reviews",
      },
      response: {
        200: reviewListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .post(
    "/:id/performance-reviews",
    async ({ params, body, request, set }) => {
      try {
        const authContext = await requirePermission(request.headers, "staff.update");
        const existing = await db.query.user.findFirst({
          where: and(eq(user.id, params.id), eq(user.userType, "staff")),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Staff user not found" };
        }

        const [review] = await db
          .insert(staffPerformanceReviews)
          .values({
            staffUserId: params.id,
            reviewerUserId: authContext.user.id,
            reviewDate: body.reviewDate,
            rating: body.rating,
            strengths: body.strengths,
            improvements: body.improvements,
            summary: body.summary,
            notes: body.notes,
          })
          .returning();

        set.status = 201;
        return { data: [review] };
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
          message:
            error instanceof Error ? error.message : "Failed to create performance review",
        };
      }
    },
    {
      params: staffParamsSchema,
      body: createReviewSchema,
      detail: {
        tags: ["Staff"],
        summary: "Create performance review",
      },
      response: {
        201: reviewListResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  );
