import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userTypeEnum = pgEnum("user_type", ["admin", "staff"]);
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "suspended",
]);
export const residentStatusEnum = pgEnum("resident_status", [
  "pending",
  "active",
  "discharged",
  "deceased",
]);
export const residentGenderEnum = pgEnum("resident_gender", [
  "male",
  "female",
  "other",
  "undisclosed",
]);
export const contactTypeEnum = pgEnum("resident_contact_type", [
  "next_of_kin",
  "guardian",
  "family",
  "emergency",
  "other",
]);
export const admissionStatusEnum = pgEnum("resident_admission_status", [
  "planned",
  "admitted",
  "discharged",
  "cancelled",
]);
export const roomStatusEnum = pgEnum("room_status", [
  "available",
  "occupied",
  "maintenance",
  "inactive",
]);
export const bedStatusEnum = pgEnum("bed_status", [
  "available",
  "occupied",
  "maintenance",
  "inactive",
]);
export const allocationStatusEnum = pgEnum("resident_allocation_status", [
  "active",
  "transferred",
  "ended",
]);
export const mobilityStatusEnum = pgEnum("resident_mobility_status", [
  "independent",
  "assisted",
  "wheelchair",
  "bedridden",
]);
export const documentTypeEnum = pgEnum("resident_document_type", [
  "id",
  "insurance",
  "medical",
  "consent",
  "other",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  userType: userTypeEnum("user_type").default("staff").notNull(),
  status: userStatusEnum("status").default("active").notNull(),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  code: varchar("code", { length: 60 }).notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  resource: varchar("resource", { length: 60 }).notNull(),
  action: varchar("action", { length: 60 }).notNull(),
  code: varchar("code", { length: 120 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("role_permissions_role_id_idx").on(table.roleId),
    index("role_permissions_permission_id_idx").on(table.permissionId),
  ],
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    employeeId: varchar("employee_id", { length: 60 }),
    jobTitle: varchar("job_title", { length: 120 }),
    department: varchar("department", { length: 120 }),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("user_profiles_user_id_idx").on(table.userId)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_roles_user_id_idx").on(table.userId),
    index("user_roles_role_id_idx").on(table.roleId),
  ],
);

export const residents = pgTable(
  "residents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residentNumber: varchar("resident_number", { length: 60 }).notNull().unique(),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    preferredName: varchar("preferred_name", { length: 120 }),
    gender: residentGenderEnum("gender").default("undisclosed").notNull(),
    dateOfBirth: date("date_of_birth"),
    nationalIdNumber: varchar("national_id_number", { length: 120 }),
    passportNumber: varchar("passport_number", { length: 120 }),
    status: residentStatusEnum("status").default("pending").notNull(),
    profileImage: text("profile_image"),
    phoneNumber: varchar("phone_number", { length: 40 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 120 }),
    country: varchar("country", { length: 120 }),
    postalCode: varchar("postal_code", { length: 40 }),
    religion: varchar("religion", { length: 120 }),
    language: varchar("language", { length: 120 }),
    notes: text("notes"),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("residents_status_idx").on(table.status),
    index("residents_last_name_idx").on(table.lastName),
  ],
);

export const residentContacts = pgTable(
  "resident_contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residentId: uuid("resident_id")
      .notNull()
      .references(() => residents.id, { onDelete: "cascade" }),
    type: contactTypeEnum("type").default("family").notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    relationship: varchar("relationship", { length: 120 }),
    phoneNumber: varchar("phone_number", { length: 40 }),
    alternatePhoneNumber: varchar("alternate_phone_number", { length: 40 }),
    email: varchar("email", { length: 255 }),
    address: text("address"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    canReceiveUpdates: boolean("can_receive_updates").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resident_contacts_resident_id_idx").on(table.residentId),
    index("resident_contacts_type_idx").on(table.type),
  ],
);

export const residentAdmissions = pgTable(
  "resident_admissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residentId: uuid("resident_id")
      .notNull()
      .references(() => residents.id, { onDelete: "cascade" }),
    admissionDate: timestamp("admission_date").notNull(),
    dischargeDate: timestamp("discharge_date"),
    status: admissionStatusEnum("status").default("planned").notNull(),
    source: varchar("source", { length: 120 }),
    reason: text("reason"),
    careLevel: varchar("care_level", { length: 120 }),
    physicianName: varchar("physician_name", { length: 160 }),
    dischargeReason: text("discharge_reason"),
    dischargeNotes: text("discharge_notes"),
    admittedBy: text("admitted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resident_admissions_resident_id_idx").on(table.residentId),
    index("resident_admissions_status_idx").on(table.status),
  ],
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 60 }).notNull().unique(),
    floor: varchar("floor", { length: 60 }),
    wing: varchar("wing", { length: 60 }),
    roomType: varchar("room_type", { length: 60 }),
    status: roomStatusEnum("status").default("available").notNull(),
    capacity: varchar("capacity", { length: 20 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("rooms_status_idx").on(table.status)],
);

export const beds = pgTable(
  "beds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 60 }).notNull().unique(),
    status: bedStatusEnum("status").default("available").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("beds_room_id_idx").on(table.roomId),
    index("beds_status_idx").on(table.status),
  ],
);

export const residentRoomAllocations = pgTable(
  "resident_room_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residentId: uuid("resident_id")
      .notNull()
      .references(() => residents.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    bedId: uuid("bed_id")
      .notNull()
      .references(() => beds.id, { onDelete: "restrict" }),
    allocationDate: timestamp("allocation_date").notNull(),
    releaseDate: timestamp("release_date"),
    status: allocationStatusEnum("status").default("active").notNull(),
    reason: text("reason"),
    notes: text("notes"),
    assignedBy: text("assigned_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resident_room_allocations_resident_id_idx").on(table.residentId),
    index("resident_room_allocations_room_id_idx").on(table.roomId),
    index("resident_room_allocations_bed_id_idx").on(table.bedId),
    index("resident_room_allocations_status_idx").on(table.status),
  ],
);

export const residentMedicalProfiles = pgTable(
  "resident_medical_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residentId: uuid("resident_id")
      .notNull()
      .unique()
      .references(() => residents.id, { onDelete: "cascade" }),
    bloodGroup: varchar("blood_group", { length: 10 }),
    genotype: varchar("genotype", { length: 10 }),
    allergies: text("allergies"),
    chronicConditions: text("chronic_conditions"),
    currentDiagnoses: text("current_diagnoses"),
    dietaryNotes: text("dietary_notes"),
    mobilityStatus: mobilityStatusEnum("mobility_status"),
    disabilityNotes: text("disability_notes"),
    mentalHealthNotes: text("mental_health_notes"),
    fallRiskNotes: text("fall_risk_notes"),
    careNotes: text("care_notes"),
    emergencyMedicalNotes: text("emergency_medical_notes"),
    primaryPhysicianName: varchar("primary_physician_name", { length: 160 }),
    primaryPhysicianPhone: varchar("primary_physician_phone", { length: 40 }),
    insuranceProvider: varchar("insurance_provider", { length: 160 }),
    insuranceMemberNumber: varchar("insurance_member_number", { length: 160 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("resident_medical_profiles_resident_id_idx").on(table.residentId)],
);

export const residentDocuments = pgTable(
  "resident_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    residentId: uuid("resident_id")
      .notNull()
      .references(() => residents.id, { onDelete: "cascade" }),
    documentType: documentTypeEnum("document_type").default("other").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    fileName: varchar("file_name", { length: 255 }),
    fileUrl: text("file_url").notNull(),
    mimeType: varchar("mime_type", { length: 120 }),
    notes: text("notes"),
    uploadedBy: text("uploaded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("resident_documents_resident_id_idx").on(table.residentId),
    index("resident_documents_document_type_idx").on(table.documentType),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  profile: one(userProfiles, {
    fields: [user.id],
    references: [userProfiles.userId],
  }),
  userRoles: many(userRoles),
  createdResidents: many(residents, {
    relationName: "resident_created_by",
  }),
  updatedResidents: many(residents, {
    relationName: "resident_updated_by",
  }),
  admittedResidents: many(residentAdmissions, {
    relationName: "resident_admitted_by",
  }),
  assignedResidentAllocations: many(residentRoomAllocations, {
    relationName: "resident_assigned_by",
  }),
  uploadedResidentDocuments: many(residentDocuments, {
    relationName: "resident_uploaded_by",
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userProfileRelations = relations(userProfiles, ({ one }) => ({
  user: one(user, {
    fields: [userProfiles.userId],
    references: [user.id],
  }),
}));

export const roleRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const userRoleRelations = relations(userRoles, ({ one }) => ({
  user: one(user, {
    fields: [userRoles.userId],
    references: [user.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const rolePermissionRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const residentRelations = relations(residents, ({ many, one }) => ({
  contacts: many(residentContacts),
  admissions: many(residentAdmissions),
  roomAllocations: many(residentRoomAllocations),
  medicalProfile: one(residentMedicalProfiles, {
    fields: [residents.id],
    references: [residentMedicalProfiles.residentId],
  }),
  documents: many(residentDocuments),
  createdByUser: one(user, {
    relationName: "resident_created_by",
    fields: [residents.createdBy],
    references: [user.id],
  }),
  updatedByUser: one(user, {
    relationName: "resident_updated_by",
    fields: [residents.updatedBy],
    references: [user.id],
  }),
}));

export const residentContactRelations = relations(residentContacts, ({ one }) => ({
  resident: one(residents, {
    fields: [residentContacts.residentId],
    references: [residents.id],
  }),
}));

export const residentAdmissionRelations = relations(
  residentAdmissions,
  ({ one }) => ({
    resident: one(residents, {
      fields: [residentAdmissions.residentId],
      references: [residents.id],
    }),
    admittedByUser: one(user, {
      relationName: "resident_admitted_by",
      fields: [residentAdmissions.admittedBy],
      references: [user.id],
    }),
  }),
);

export const roomRelations = relations(rooms, ({ many }) => ({
  beds: many(beds),
  residentAllocations: many(residentRoomAllocations),
}));

export const bedRelations = relations(beds, ({ many, one }) => ({
  room: one(rooms, {
    fields: [beds.roomId],
    references: [rooms.id],
  }),
  residentAllocations: many(residentRoomAllocations),
}));

export const residentRoomAllocationRelations = relations(
  residentRoomAllocations,
  ({ one }) => ({
    resident: one(residents, {
      fields: [residentRoomAllocations.residentId],
      references: [residents.id],
    }),
    room: one(rooms, {
      fields: [residentRoomAllocations.roomId],
      references: [rooms.id],
    }),
    bed: one(beds, {
      fields: [residentRoomAllocations.bedId],
      references: [beds.id],
    }),
    assignedByUser: one(user, {
      relationName: "resident_assigned_by",
      fields: [residentRoomAllocations.assignedBy],
      references: [user.id],
    }),
  }),
);

export const residentMedicalProfileRelations = relations(
  residentMedicalProfiles,
  ({ one }) => ({
    resident: one(residents, {
      fields: [residentMedicalProfiles.residentId],
      references: [residents.id],
    }),
  }),
);

export const residentDocumentRelations = relations(
  residentDocuments,
  ({ one }) => ({
    resident: one(residents, {
      fields: [residentDocuments.residentId],
      references: [residents.id],
    }),
    uploadedByUser: one(user, {
      relationName: "resident_uploaded_by",
      fields: [residentDocuments.uploadedBy],
      references: [user.id],
    }),
  }),
);
