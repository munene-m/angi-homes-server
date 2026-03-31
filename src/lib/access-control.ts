import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../db/drizzle";
import { permissions, rolePermissions, roles, userRoles } from "../db/schema";
import { auth } from "./auth";

const SYSTEM_PERMISSIONS = [
  {
    resource: "users",
    action: "read",
    code: "users.read",
    description: "View dashboard users",
  },
  {
    resource: "users",
    action: "create",
    code: "users.create",
    description: "Create dashboard users",
  },
  {
    resource: "users",
    action: "update",
    code: "users.update",
    description: "Update dashboard users",
  },
  {
    resource: "users",
    action: "delete",
    code: "users.delete",
    description: "Delete dashboard users",
  },
  {
    resource: "roles",
    action: "assign",
    code: "roles.assign",
    description: "Assign roles to dashboard users",
  },
  {
    resource: "residents",
    action: "read",
    code: "residents.read",
    description: "View residents",
  },
  {
    resource: "residents",
    action: "create",
    code: "residents.create",
    description: "Create residents",
  },
  {
    resource: "residents",
    action: "update",
    code: "residents.update",
    description: "Update residents",
  },
  {
    resource: "residents",
    action: "delete",
    code: "residents.delete",
    description: "Archive residents",
  },
  {
    resource: "staff",
    action: "read",
    code: "staff.read",
    description: "View staff profiles, shifts and reviews",
  },
  {
    resource: "staff",
    action: "create",
    code: "staff.create",
    description: "Create staff users and assignments",
  },
  {
    resource: "staff",
    action: "update",
    code: "staff.update",
    description: "Update staff users and assignments",
  },
  {
    resource: "staff",
    action: "delete",
    code: "staff.delete",
    description: "Delete staff users",
  },
  {
    resource: "appointments",
    action: "read",
    code: "appointments.read",
    description: "View appointments",
  },
  {
    resource: "appointments",
    action: "create",
    code: "appointments.create",
    description: "Create appointments",
  },
  {
    resource: "appointments",
    action: "update",
    code: "appointments.update",
    description: "Update appointments",
  },
  {
    resource: "appointments",
    action: "delete",
    code: "appointments.delete",
    description: "Delete appointments",
  },
  {
    resource: "visits",
    action: "read",
    code: "visits.read",
    description: "View visits",
  },
  {
    resource: "visits",
    action: "create",
    code: "visits.create",
    description: "Create visits",
  },
  {
    resource: "visits",
    action: "update",
    code: "visits.update",
    description: "Update visits",
  },
  {
    resource: "visits",
    action: "delete",
    code: "visits.delete",
    description: "Delete visits",
  },
] as const;

const SYSTEM_ROLES = [
  {
    name: "Super Admin",
    code: "super_admin",
    description: "Full system access",
    permissions: SYSTEM_PERMISSIONS.map((permission) => permission.code),
  },
  {
    name: "Admin",
    code: "admin",
    description: "Administrative access to user management",
    permissions: [
      "users.read",
      "users.create",
      "users.update",
      "residents.read",
      "residents.create",
      "residents.update",
      "staff.read",
      "staff.create",
      "staff.update",
      "staff.delete",
      "appointments.read",
      "appointments.create",
      "appointments.update",
      "appointments.delete",
      "visits.read",
      "visits.create",
      "visits.update",
      "visits.delete",
    ],
  },
  {
    name: "Staff Manager",
    code: "staff_manager",
    description: "Staff account management access",
    permissions: [
      "users.read",
      "users.create",
      "users.update",
      "staff.read",
      "staff.create",
      "staff.update",
      "staff.delete",
      "appointments.read",
      "appointments.create",
      "appointments.update",
      "visits.read",
      "visits.create",
      "visits.update",
    ],
  },
] as const;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthContext = {
  session: Record<string, unknown>;
  user: SessionUser;
  roleCodes: string[];
  permissionCodes: string[];
};

export const ensureAccessControlSeed = async (): Promise<void> => {
  const existingPermissions = await db
    .select({ code: permissions.code })
    .from(permissions);

  const existingPermissionCodes = new Set(
    existingPermissions.map((permission) => permission.code),
  );

  const missingPermissions = SYSTEM_PERMISSIONS.filter(
    (permission) => !existingPermissionCodes.has(permission.code),
  );

  if (missingPermissions.length > 0) {
    await db.insert(permissions).values(missingPermissions);
  }

  const existingRoles = await db.select({ code: roles.code }).from(roles);
  const existingRoleCodes = new Set(existingRoles.map((role) => role.code));
  const missingRoles = SYSTEM_ROLES.filter((role) => !existingRoleCodes.has(role.code)).map(
    ({ permissions: _permissions, ...role }) => ({
      ...role,
      isSystem: true,
    }),
  );

  if (missingRoles.length > 0) {
    await db.insert(roles).values(missingRoles);
  }

  const persistedRoles = await db.select().from(roles);
  const persistedPermissions = await db.select().from(permissions);
  const permissionIdByCode = new Map(
    persistedPermissions.map((permission) => [permission.code, permission.id]),
  );

  const rolePermissionRows = SYSTEM_ROLES.flatMap((role) => {
    const persistedRole = persistedRoles.find(
      (persistedItem) => persistedItem.code === role.code,
    );

    if (!persistedRole) {
      return [];
    }

    return role.permissions
      .map((permissionCode) => {
        const permissionId = permissionIdByCode.get(permissionCode);

        if (!permissionId) {
          return null;
        }

        return {
          roleId: persistedRole.id,
          permissionId,
        };
      })
      .filter((value): value is { roleId: string; permissionId: string } => value !== null);
  });

  if (rolePermissionRows.length === 0) {
    return;
  }

  const existingRolePermissions = await db.select().from(rolePermissions);
  const existingPairs = new Set(
    existingRolePermissions.map(
      (rolePermission) => `${rolePermission.roleId}:${rolePermission.permissionId}`,
    ),
  );

  const missingRolePermissions = rolePermissionRows.filter(
    (rolePermission) =>
      !existingPairs.has(`${rolePermission.roleId}:${rolePermission.permissionId}`),
  );

  if (missingRolePermissions.length > 0) {
    await db.insert(rolePermissions).values(missingRolePermissions);
  }
};

export const getAuthContext = async (
  headers: Headers,
): Promise<AuthContext | null> => {
  const sessionData = await auth.api.getSession({
    headers,
  });

  if (!sessionData?.user) {
    return null;
  }

  const assignments = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, sessionData.user.id),
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
  });

  const roleCodes = assignments.map((assignment) => assignment.role.code);
  const permissionCodes = new Set<string>();

  for (const assignment of assignments) {
    for (const rolePermission of assignment.role.rolePermissions) {
      permissionCodes.add(rolePermission.permission.code);
    }
  }

  return {
    session: sessionData.session,
    user: {
      id: sessionData.user.id,
      email: sessionData.user.email,
      name: sessionData.user.name,
    },
    roleCodes,
    permissionCodes: [...permissionCodes],
  };
};

export const requirePermission = async (
  headers: Headers,
  permissionCode: string,
): Promise<AuthContext> => {
  const authContext = await getAuthContext(headers);

  if (!authContext) {
    throw new Error("UNAUTHORIZED");
  }

  if (
    authContext.roleCodes.includes("super_admin") ||
    authContext.permissionCodes.includes(permissionCode)
  ) {
    return authContext;
  }

  throw new Error("FORBIDDEN");
};

export const getRoleIdsByCodes = async (roleCodes: string[]) => {
  if (roleCodes.length === 0) {
    return [];
  }

  return db.select().from(roles).where(inArray(roles.code, roleCodes));
};

export const countUsers = async (): Promise<number> => {
  const [result] = await db.select({ value: count() }).from(userRoles);

  return result?.value ?? 0;
};

export const assignRolesToUser = async (
  userId: string,
  roleIds: string[],
): Promise<void> => {
  await db.delete(userRoles).where(eq(userRoles.userId, userId));

  if (roleIds.length === 0) {
    return;
  }

  await db.insert(userRoles).values(
    roleIds.map((roleId) => ({
      userId,
      roleId,
    })),
  );
};

export const hasAssignedRoles = async (userId: string): Promise<boolean> => {
  const [result] = await db
    .select({ value: count() })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  return (result?.value ?? 0) > 0;
};

export const isOnlySuperAdmin = async (userId: string): Promise<boolean> => {
  const superAdminRole = await db
    .select()
    .from(roles)
    .where(eq(roles.code, "super_admin"))
    .limit(1);

  const role = superAdminRole[0];

  if (!role) {
    return false;
  }

  const [superAdminCount] = await db
    .select({ value: count() })
    .from(userRoles)
    .where(eq(userRoles.roleId, role.id));

  const [assignment] = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
    .limit(1);

  return Boolean(assignment) && (superAdminCount?.value ?? 0) <= 1;
};
