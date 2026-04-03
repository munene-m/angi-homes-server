import { and, desc, eq, ilike, or } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/drizzle";
import {
  beds,
  residentAdmissions,
  residentContacts,
  residentMedicalProfiles,
  residentRoomAllocations,
  residents,
  rooms,
} from "../db/schema";
import { requirePermission } from "../lib/access-control";

const residentBaseSchema = t.Object({
  residentNumber: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  firstName: t.String({ minLength: 1, maxLength: 120 }),
  lastName: t.String({ minLength: 1, maxLength: 120 }),
  preferredName: t.Optional(t.String({ maxLength: 120 })),
  gender: t.Optional(
    t.UnionEnum(["male", "female", "other", "undisclosed"] as const),
  ),
  dateOfBirth: t.Optional(t.String({ format: "date" })),
  nationalIdNumber: t.Optional(t.String({ maxLength: 120 })),
  passportNumber: t.Optional(t.String({ maxLength: 120 })),
  status: t.Optional(
    t.UnionEnum(["pending", "active", "discharged", "deceased"] as const),
  ),
  profileImage: t.Optional(t.String({ format: "uri" })),
  phoneNumber: t.Optional(t.String({ maxLength: 40 })),
  email: t.Optional(t.String({ format: "email" })),
  address: t.Optional(t.String()),
  city: t.Optional(t.String({ maxLength: 120 })),
  state: t.Optional(t.String({ maxLength: 120 })),
  country: t.Optional(t.String({ maxLength: 120 })),
  postalCode: t.Optional(t.String({ maxLength: 40 })),
  religion: t.Optional(t.String({ maxLength: 120 })),
  language: t.Optional(t.String({ maxLength: 120 })),
  notes: t.Optional(t.String()),
  isArchived: t.Optional(t.Boolean()),
});

const createResidentSchema = residentBaseSchema;
const updateResidentSchema = t.Partial(residentBaseSchema);

const generateResidentNumber = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomChunk = Math.floor(Math.random() * 900000 + 100000).toString();
    const candidate = `AHR-${year}${randomChunk}`;
    const exists = await db.query.residents.findFirst({
      where: eq(residents.residentNumber, candidate),
      columns: {
        id: true,
      },
    });

    if (!exists) {
      return candidate;
    }
  }

  return `AHR-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
};

const generateRoomCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomChunk = Math.floor(Math.random() * 9000 + 1000).toString();
    const candidate = `RM-${year}${randomChunk}`;
    const exists = await db.query.rooms.findFirst({
      where: eq(rooms.code, candidate),
      columns: {
        id: true,
      },
    });

    if (!exists) {
      return candidate;
    }
  }

  return `RM-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
};

const generateBedCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomChunk = Math.floor(Math.random() * 9000 + 1000).toString();
    const candidate = `BD-${year}${randomChunk}`;
    const exists = await db.query.beds.findFirst({
      where: eq(beds.code, candidate),
      columns: {
        id: true,
      },
    });

    if (!exists) {
      return candidate;
    }
  }

  return `BD-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
};

const residentParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

const residentContactParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
  contactId: t.String({ format: "uuid" }),
});

const residentAdmissionParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
  admissionId: t.String({ format: "uuid" }),
});
const roomParamsSchema = t.Object({
  roomId: t.String({ format: "uuid" }),
});
const bedParamsSchema = t.Object({
  bedId: t.String({ format: "uuid" }),
});
const residentAllocationParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
  allocationId: t.String({ format: "uuid" }),
});

const listResidentsQuerySchema = t.Object({
  q: t.Optional(t.String()),
  status: t.Optional(
    t.UnionEnum(["pending", "active", "discharged", "deceased"] as const),
  ),
  includeArchived: t.Optional(t.Boolean()),
});

const residentContactTypeSchema = t.UnionEnum(
  ["next_of_kin", "guardian", "family", "emergency", "other"] as const,
);
const residentAdmissionStatusSchema = t.UnionEnum(
  ["planned", "admitted", "discharged", "cancelled"] as const,
);
const roomStatusSchema = t.UnionEnum(
  ["available", "occupied", "maintenance", "inactive"] as const,
);
const bedStatusSchema = t.UnionEnum(
  ["available", "occupied", "maintenance", "inactive"] as const,
);
const allocationStatusSchema = t.UnionEnum(
  ["active", "transferred", "ended"] as const,
);
const mobilityStatusSchema = t.UnionEnum(
  ["independent", "assisted", "wheelchair", "bedridden"] as const,
);

const residentContactSchema = t.Object({
  id: t.String({ format: "uuid" }),
  residentId: t.String({ format: "uuid" }),
  type: residentContactTypeSchema,
  fullName: t.String(),
  relationship: t.Nullable(t.String()),
  phoneNumber: t.Nullable(t.String()),
  alternatePhoneNumber: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
  address: t.Nullable(t.String()),
  isPrimary: t.Boolean(),
  canReceiveUpdates: t.Boolean(),
  notes: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const createResidentContactSchema = t.Object({
  type: t.Optional(residentContactTypeSchema),
  fullName: t.String({ minLength: 1, maxLength: 160 }),
  relationship: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  phoneNumber: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  alternatePhoneNumber: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  email: t.Optional(t.String({ format: "email" })),
  address: t.Optional(t.String()),
  isPrimary: t.Optional(t.Boolean()),
  canReceiveUpdates: t.Optional(t.Boolean()),
  notes: t.Optional(t.String()),
});

const updateResidentContactSchema = t.Object({
  type: t.Optional(residentContactTypeSchema),
  fullName: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  relationship: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  phoneNumber: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  alternatePhoneNumber: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  email: t.Optional(t.String({ format: "email" })),
  address: t.Optional(t.String()),
  isPrimary: t.Optional(t.Boolean()),
  canReceiveUpdates: t.Optional(t.Boolean()),
  notes: t.Optional(t.String()),
});

const residentAdmissionSchema = t.Object({
  id: t.String({ format: "uuid" }),
  residentId: t.String({ format: "uuid" }),
  admissionDate: t.Date(),
  dischargeDate: t.Union([t.Date(), t.Null()]),
  status: residentAdmissionStatusSchema,
  source: t.Nullable(t.String()),
  reason: t.Nullable(t.String()),
  careLevel: t.Nullable(t.String()),
  physicianName: t.Nullable(t.String()),
  dischargeReason: t.Nullable(t.String()),
  dischargeNotes: t.Nullable(t.String()),
  admittedBy: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const createResidentAdmissionSchema = t.Object({
  admissionDate: t.String({ format: "date-time" }),
  dischargeDate: t.Optional(t.String({ format: "date-time" })),
  status: t.Optional(residentAdmissionStatusSchema),
  source: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  reason: t.Optional(t.String()),
  careLevel: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  physicianName: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  dischargeReason: t.Optional(t.String()),
  dischargeNotes: t.Optional(t.String()),
});

const updateResidentAdmissionSchema = t.Object({
  admissionDate: t.Optional(t.String({ format: "date-time" })),
  dischargeDate: t.Optional(t.String({ format: "date-time" })),
  status: t.Optional(residentAdmissionStatusSchema),
  source: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  reason: t.Optional(t.String()),
  careLevel: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  physicianName: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  dischargeReason: t.Optional(t.String()),
  dischargeNotes: t.Optional(t.String()),
});

const roomSchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  code: t.String(),
  floor: t.Nullable(t.String()),
  wing: t.Nullable(t.String()),
  roomType: t.Nullable(t.String()),
  status: roomStatusSchema,
  capacity: t.Nullable(t.String()),
  notes: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const createRoomSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  code: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  floor: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  wing: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  roomType: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  status: t.Optional(roomStatusSchema),
  capacity: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
  notes: t.Optional(t.String()),
});

const updateRoomSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  code: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  floor: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  wing: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  roomType: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  status: t.Optional(roomStatusSchema),
  capacity: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
  notes: t.Optional(t.String()),
});

const bedSchema = t.Object({
  id: t.String({ format: "uuid" }),
  roomId: t.String({ format: "uuid" }),
  name: t.String(),
  code: t.String(),
  status: bedStatusSchema,
  notes: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const createBedSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  code: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  status: t.Optional(bedStatusSchema),
  notes: t.Optional(t.String()),
});

const updateBedSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  code: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
  status: t.Optional(bedStatusSchema),
  notes: t.Optional(t.String()),
});

const residentAllocationSchema = t.Object({
  id: t.String({ format: "uuid" }),
  residentId: t.String({ format: "uuid" }),
  roomId: t.String({ format: "uuid" }),
  bedId: t.String({ format: "uuid" }),
  allocationDate: t.Date(),
  releaseDate: t.Union([t.Date(), t.Null()]),
  status: allocationStatusSchema,
  reason: t.Nullable(t.String()),
  notes: t.Nullable(t.String()),
  assignedBy: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const createResidentAllocationSchema = t.Object({
  roomId: t.String({ format: "uuid" }),
  bedId: t.String({ format: "uuid" }),
  allocationDate: t.String({ format: "date-time" }),
  releaseDate: t.Optional(t.String({ format: "date-time" })),
  status: t.Optional(allocationStatusSchema),
  reason: t.Optional(t.String()),
  notes: t.Optional(t.String()),
});

const updateResidentAllocationSchema = t.Object({
  roomId: t.Optional(t.String({ format: "uuid" })),
  bedId: t.Optional(t.String({ format: "uuid" })),
  allocationDate: t.Optional(t.String({ format: "date-time" })),
  releaseDate: t.Optional(t.String({ format: "date-time" })),
  status: t.Optional(allocationStatusSchema),
  reason: t.Optional(t.String()),
  notes: t.Optional(t.String()),
});

const residentMedicalProfileSchema = t.Object({
  id: t.String({ format: "uuid" }),
  residentId: t.String({ format: "uuid" }),
  bloodGroup: t.Nullable(t.String()),
  genotype: t.Nullable(t.String()),
  allergies: t.Nullable(t.String()),
  chronicConditions: t.Nullable(t.String()),
  currentDiagnoses: t.Nullable(t.String()),
  dietaryNotes: t.Nullable(t.String()),
  mobilityStatus: t.Union([mobilityStatusSchema, t.Null()]),
  disabilityNotes: t.Nullable(t.String()),
  mentalHealthNotes: t.Nullable(t.String()),
  fallRiskNotes: t.Nullable(t.String()),
  careNotes: t.Nullable(t.String()),
  emergencyMedicalNotes: t.Nullable(t.String()),
  primaryPhysicianName: t.Nullable(t.String()),
  primaryPhysicianPhone: t.Nullable(t.String()),
  insuranceProvider: t.Nullable(t.String()),
  insuranceMemberNumber: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const upsertResidentMedicalProfileSchema = t.Object({
  bloodGroup: t.Optional(t.String({ minLength: 1, maxLength: 10 })),
  genotype: t.Optional(t.String({ minLength: 1, maxLength: 10 })),
  allergies: t.Optional(t.String()),
  chronicConditions: t.Optional(t.String()),
  currentDiagnoses: t.Optional(t.String()),
  dietaryNotes: t.Optional(t.String()),
  mobilityStatus: t.Optional(mobilityStatusSchema),
  disabilityNotes: t.Optional(t.String()),
  mentalHealthNotes: t.Optional(t.String()),
  fallRiskNotes: t.Optional(t.String()),
  careNotes: t.Optional(t.String()),
  emergencyMedicalNotes: t.Optional(t.String()),
  primaryPhysicianName: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  primaryPhysicianPhone: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  insuranceProvider: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  insuranceMemberNumber: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
});

const residentListResponseSchema = t.Object({
  data: t.Array(
    t.Object({
      id: t.String({ format: "uuid" }),
      residentNumber: t.String(),
      firstName: t.String(),
      lastName: t.String(),
      preferredName: t.Nullable(t.String()),
      gender: t.UnionEnum(["male", "female", "other", "undisclosed"] as const),
      dateOfBirth: t.Nullable(t.String()),
      nationalIdNumber: t.Nullable(t.String()),
      passportNumber: t.Nullable(t.String()),
      status: t.UnionEnum(["pending", "active", "discharged", "deceased"] as const),
      profileImage: t.Nullable(t.String()),
      phoneNumber: t.Nullable(t.String()),
      email: t.Nullable(t.String()),
      address: t.Nullable(t.String()),
      city: t.Nullable(t.String()),
      state: t.Nullable(t.String()),
      country: t.Nullable(t.String()),
      postalCode: t.Nullable(t.String()),
      religion: t.Nullable(t.String()),
      language: t.Nullable(t.String()),
      notes: t.Nullable(t.String()),
      isArchived: t.Boolean(),
      createdBy: t.Nullable(t.String()),
      updatedBy: t.Nullable(t.String()),
      createdAt: t.Date(),
      updatedAt: t.Date(),
      contacts: t.Any(),
      admissions: t.Any(),
      roomAllocations: t.Any(),
      medicalProfile: t.Any(),
    }),
  ),
});

const residentRecordResponseSchema = t.Object({
  data: t.Object({
    id: t.String({ format: "uuid" }),
    residentNumber: t.String(),
    firstName: t.String(),
    lastName: t.String(),
    preferredName: t.Nullable(t.String()),
    gender: t.UnionEnum(["male", "female", "other", "undisclosed"] as const),
    dateOfBirth: t.Nullable(t.String()),
    nationalIdNumber: t.Nullable(t.String()),
    passportNumber: t.Nullable(t.String()),
    status: t.UnionEnum(["pending", "active", "discharged", "deceased"] as const),
    profileImage: t.Nullable(t.String()),
    phoneNumber: t.Nullable(t.String()),
    email: t.Nullable(t.String()),
    address: t.Nullable(t.String()),
    city: t.Nullable(t.String()),
    state: t.Nullable(t.String()),
    country: t.Nullable(t.String()),
    postalCode: t.Nullable(t.String()),
    religion: t.Nullable(t.String()),
    language: t.Nullable(t.String()),
    notes: t.Nullable(t.String()),
    isArchived: t.Boolean(),
    createdBy: t.Nullable(t.String()),
    updatedBy: t.Nullable(t.String()),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    contacts: t.Any(),
    admissions: t.Any(),
    roomAllocations: t.Any(),
    medicalProfile: t.Any(),
    documents: t.Any(),
    createdByUser: t.Any(),
    updatedByUser: t.Any(),
  }),
});

const messageResponseSchema = t.Object({
  message: t.String(),
});

const validationErrorResponseSchema = t.Object({
  message: t.String(),
  issues: t.Any(),
});

const residentContactListResponseSchema = t.Object({
  data: t.Array(residentContactSchema),
});

const residentContactRecordResponseSchema = t.Object({
  data: residentContactSchema,
});

const residentAdmissionListResponseSchema = t.Object({
  data: t.Array(residentAdmissionSchema),
});

const residentAdmissionRecordResponseSchema = t.Object({
  data: residentAdmissionSchema,
});
const roomListResponseSchema = t.Object({
  data: t.Array(roomSchema),
});
const roomRecordResponseSchema = t.Object({
  data: roomSchema,
});
const bedListResponseSchema = t.Object({
  data: t.Array(bedSchema),
});
const bedRecordResponseSchema = t.Object({
  data: bedSchema,
});
const residentAllocationListResponseSchema = t.Object({
  data: t.Array(residentAllocationSchema),
});
const residentAllocationRecordResponseSchema = t.Object({
  data: residentAllocationSchema,
});
const residentMedicalProfileRecordResponseSchema = t.Object({
  data: residentMedicalProfileSchema,
});

const serializeResident = async (residentId: string) => {
  return db.query.residents.findFirst({
    where: eq(residents.id, residentId),
    with: {
      contacts: true,
      admissions: true,
      roomAllocations: {
        with: {
          room: true,
          bed: true,
        },
      },
      medicalProfile: true,
      documents: true,
      createdByUser: true,
      updatedByUser: true,
    },
  });
};

export const residentsApp = new Elysia({ prefix: "/api/admin/residents" })
  .get(
    "/",
    async ({ query, request, set }) => {
    try {
      await requirePermission(request.headers, "residents.read");
      const filters = query;
      const url = new URL(request.url);
      const includeArchivedRequested = url.searchParams.get("includeArchived") === "true";
      const hasStatusFilter = url.searchParams.has("status");
      const conditions = [];

      if (!includeArchivedRequested) {
        conditions.push(eq(residents.isArchived, false));
      }

      if (hasStatusFilter && filters.status) {
        conditions.push(eq(residents.status, filters.status));
      }

      if (filters.q) {
        conditions.push(
          or(
            ilike(residents.firstName, `%${filters.q}%`),
            ilike(residents.lastName, `%${filters.q}%`),
            ilike(residents.residentNumber, `%${filters.q}%`),
          )!,
        );
      }

      const data = await db.query.residents.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          contacts: true,
          admissions: true,
          roomAllocations: {
            with: {
              room: true,
              bed: true,
            },
          },
          medicalProfile: true,
        },
        orderBy: [desc(residents.createdAt)],
      });

      return { data };
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
      query: listResidentsQuerySchema,
      detail: {
        tags: ["Residents"],
        summary: "List residents",
      },
      response: {
        200: residentListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
      },
    },
  )
  .get(
    "/:id",
    async ({ params, request, set }) => {
    try {
      await requirePermission(request.headers, "residents.read");
      const resident = await serializeResident(params.id);

      if (!resident) {
        set.status = 404;
        return { message: "Resident not found" };
      }

      return { data: resident };
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
      params: residentParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "Get resident",
      },
      response: {
        200: residentRecordResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .post(
    "/",
    async ({ body, request, set }) => {
    try {
      const authContext = await requirePermission(request.headers, "residents.create");
      const parsed = body;
      const { residentNumber, ...residentPayload } = parsed;
      const generatedResidentNumber = residentNumber?.trim() || (await generateResidentNumber());

      const [created] = await db
        .insert(residents)
        .values({
          ...residentPayload,
          residentNumber: generatedResidentNumber,
          createdBy: authContext.user.id,
          updatedBy: authContext.user.id,
        })
        .returning();

      set.status = 201;
      return {
        data: await serializeResident(created.id),
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
        message: error instanceof Error ? error.message : "Failed to create resident",
      };
    }
    },
    {
      body: createResidentSchema,
      detail: {
        tags: ["Residents"],
        summary: "Create resident",
      },
      response: {
        201: residentRecordResponseSchema,
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
      const authContext = await requirePermission(request.headers, "residents.update");
      const parsed = body;
      const existing = await db.query.residents.findFirst({
        where: eq(residents.id, params.id),
      });

      if (!existing) {
        set.status = 404;
        return { message: "Resident not found" };
      }

      await db
        .update(residents)
        .set({
          ...parsed,
          updatedBy: authContext.user.id,
          updatedAt: new Date(),
        })
        .where(eq(residents.id, params.id));

      const updatedResident = await serializeResident(params.id);

      if (!updatedResident) {
        set.status = 500;
        return { message: "Failed to load updated resident" };
      }

      return {
        data: updatedResident,
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
        message: error instanceof Error ? error.message : "Failed to update resident",
      };
    }
    },
    {
      params: residentParamsSchema,
      body: updateResidentSchema,
      detail: {
        tags: ["Residents"],
        summary: "Update resident",
      },
      response: {
        200: residentRecordResponseSchema,
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
      const authContext = await requirePermission(request.headers, "residents.delete");
      const existing = await db.query.residents.findFirst({
        where: eq(residents.id, params.id),
      });

      if (!existing) {
        set.status = 404;
        return { message: "Resident not found" };
      }

      await db
        .update(residents)
        .set({
          isArchived: true,
          updatedBy: authContext.user.id,
          updatedAt: new Date(),
        })
        .where(eq(residents.id, params.id));

      return {
        message: "Resident archived successfully",
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
        message: error instanceof Error ? error.message : "Failed to archive resident",
      };
    }
    },
    {
      params: residentParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "Archive resident",
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
    "/:id/contacts",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.read");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });

        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }

        const data = await db.query.residentContacts.findMany({
          where: eq(residentContacts.residentId, params.id),
          orderBy: [desc(residentContacts.createdAt)],
        });

        return { data };
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
      params: residentParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "List resident contacts",
      },
      response: {
        200: residentContactListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .post(
    "/:id/contacts",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });

        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }

        const [created] = await db
          .insert(residentContacts)
          .values({
            residentId: params.id,
            type: body.type ?? "family",
            fullName: body.fullName,
            relationship: body.relationship,
            phoneNumber: body.phoneNumber,
            alternatePhoneNumber: body.alternatePhoneNumber,
            email: body.email,
            address: body.address,
            isPrimary: body.isPrimary ?? false,
            canReceiveUpdates: body.canReceiveUpdates ?? true,
            notes: body.notes,
          })
          .returning();

        set.status = 201;
        return { data: created };
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
          message: error instanceof Error ? error.message : "Failed to create resident contact",
        };
      }
    },
    {
      params: residentParamsSchema,
      body: createResidentContactSchema,
      detail: {
        tags: ["Residents"],
        summary: "Create resident contact",
      },
      response: {
        201: residentContactRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/:id/contacts/:contactId",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const existing = await db.query.residentContacts.findFirst({
          where: and(
            eq(residentContacts.id, params.contactId),
            eq(residentContacts.residentId, params.id),
          ),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Resident contact not found" };
        }

        await db
          .update(residentContacts)
          .set({
            type: body.type ?? existing.type,
            fullName: body.fullName ?? existing.fullName,
            relationship: body.relationship ?? existing.relationship,
            phoneNumber: body.phoneNumber ?? existing.phoneNumber,
            alternatePhoneNumber:
              body.alternatePhoneNumber ?? existing.alternatePhoneNumber,
            email: body.email ?? existing.email,
            address: body.address ?? existing.address,
            isPrimary: body.isPrimary ?? existing.isPrimary,
            canReceiveUpdates:
              body.canReceiveUpdates ?? existing.canReceiveUpdates,
            notes: body.notes ?? existing.notes,
            updatedAt: new Date(),
          })
          .where(eq(residentContacts.id, params.contactId));

        const updated = await db.query.residentContacts.findFirst({
          where: eq(residentContacts.id, params.contactId),
        });

        if (!updated) {
          set.status = 500;
          return { message: "Failed to load updated resident contact" };
        }

        return { data: updated };
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
          message: error instanceof Error ? error.message : "Failed to update resident contact",
        };
      }
    },
    {
      params: residentContactParamsSchema,
      body: updateResidentContactSchema,
      detail: {
        tags: ["Residents"],
        summary: "Update resident contact",
      },
      response: {
        200: residentContactRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .delete(
    "/:id/contacts/:contactId",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const existing = await db.query.residentContacts.findFirst({
          where: and(
            eq(residentContacts.id, params.contactId),
            eq(residentContacts.residentId, params.id),
          ),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Resident contact not found" };
        }

        await db.delete(residentContacts).where(eq(residentContacts.id, params.contactId));

        return { message: "Resident contact deleted successfully" };
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
          message: error instanceof Error ? error.message : "Failed to delete resident contact",
        };
      }
    },
    {
      params: residentContactParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "Delete resident contact",
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
    "/:id/admissions",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.read");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });

        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }

        const data = await db.query.residentAdmissions.findMany({
          where: eq(residentAdmissions.residentId, params.id),
          orderBy: [desc(residentAdmissions.admissionDate)],
        });

        return { data };
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
      params: residentParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "List resident admissions",
      },
      response: {
        200: residentAdmissionListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .post(
    "/:id/admissions",
    async ({ params, body, request, set }) => {
      try {
        const authContext = await requirePermission(request.headers, "residents.update");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });

        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }

        const [created] = await db
          .insert(residentAdmissions)
          .values({
            residentId: params.id,
            admissionDate: new Date(body.admissionDate),
            dischargeDate: body.dischargeDate ? new Date(body.dischargeDate) : null,
            status: body.status ?? "planned",
            source: body.source,
            reason: body.reason,
            careLevel: body.careLevel,
            physicianName: body.physicianName,
            dischargeReason: body.dischargeReason,
            dischargeNotes: body.dischargeNotes,
            admittedBy: authContext.user.id,
          })
          .returning();

        set.status = 201;
        return { data: created };
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
          message: error instanceof Error ? error.message : "Failed to create resident admission",
        };
      }
    },
    {
      params: residentParamsSchema,
      body: createResidentAdmissionSchema,
      detail: {
        tags: ["Residents"],
        summary: "Create resident admission",
      },
      response: {
        201: residentAdmissionRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/:id/admissions/:admissionId",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const existing = await db.query.residentAdmissions.findFirst({
          where: and(
            eq(residentAdmissions.id, params.admissionId),
            eq(residentAdmissions.residentId, params.id),
          ),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Resident admission not found" };
        }

        await db
          .update(residentAdmissions)
          .set({
            admissionDate: body.admissionDate
              ? new Date(body.admissionDate)
              : existing.admissionDate,
            dischargeDate: body.dischargeDate
              ? new Date(body.dischargeDate)
              : existing.dischargeDate,
            status: body.status ?? existing.status,
            source: body.source ?? existing.source,
            reason: body.reason ?? existing.reason,
            careLevel: body.careLevel ?? existing.careLevel,
            physicianName: body.physicianName ?? existing.physicianName,
            dischargeReason: body.dischargeReason ?? existing.dischargeReason,
            dischargeNotes: body.dischargeNotes ?? existing.dischargeNotes,
            updatedAt: new Date(),
          })
          .where(eq(residentAdmissions.id, params.admissionId));

        const updated = await db.query.residentAdmissions.findFirst({
          where: eq(residentAdmissions.id, params.admissionId),
        });

        if (!updated) {
          set.status = 500;
          return { message: "Failed to load updated resident admission" };
        }

        return { data: updated };
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
          message: error instanceof Error ? error.message : "Failed to update resident admission",
        };
      }
    },
    {
      params: residentAdmissionParamsSchema,
      body: updateResidentAdmissionSchema,
      detail: {
        tags: ["Residents"],
        summary: "Update resident admission",
      },
      response: {
        200: residentAdmissionRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .delete(
    "/:id/admissions/:admissionId",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const existing = await db.query.residentAdmissions.findFirst({
          where: and(
            eq(residentAdmissions.id, params.admissionId),
            eq(residentAdmissions.residentId, params.id),
          ),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Resident admission not found" };
        }

        await db.delete(residentAdmissions).where(eq(residentAdmissions.id, params.admissionId));

        return { message: "Resident admission deleted successfully" };
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
          message: error instanceof Error ? error.message : "Failed to delete resident admission",
        };
      }
    },
    {
      params: residentAdmissionParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "Delete resident admission",
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
    "/rooms",
    async ({ request, set }) => {
      try {
        await requirePermission(request.headers, "residents.read");
        const data = await db.query.rooms.findMany({
          with: {
            beds: true,
          },
          orderBy: [desc(rooms.createdAt)],
        });
        return { data };
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
        tags: ["Residents"],
        summary: "List rooms",
      },
      response: {
        200: t.Object({ data: t.Any() }),
        401: messageResponseSchema,
        403: messageResponseSchema,
      },
    },
  )
  .post(
    "/rooms",
    async ({ body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const roomCode = body.code?.trim() || (await generateRoomCode());
        const [created] = await db
          .insert(rooms)
          .values({
            name: body.name,
            code: roomCode,
            floor: body.floor,
            wing: body.wing,
            roomType: body.roomType,
            status: body.status ?? "available",
            capacity: body.capacity,
            notes: body.notes,
          })
          .returning();
        set.status = 201;
        return { data: created };
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
        return { message: error instanceof Error ? error.message : "Failed to create room" };
      }
    },
    {
      body: createRoomSchema,
      detail: {
        tags: ["Residents"],
        summary: "Create room",
      },
      response: {
        201: roomRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/rooms/:roomId",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const existing = await db.query.rooms.findFirst({
          where: eq(rooms.id, params.roomId),
        });
        if (!existing) {
          set.status = 404;
          return { message: "Room not found" };
        }
        await db
          .update(rooms)
          .set({
            name: body.name ?? existing.name,
            code: existing.code,
            floor: body.floor ?? existing.floor,
            wing: body.wing ?? existing.wing,
            roomType: body.roomType ?? existing.roomType,
            status: body.status ?? existing.status,
            capacity: body.capacity ?? existing.capacity,
            notes: body.notes ?? existing.notes,
            updatedAt: new Date(),
          })
          .where(eq(rooms.id, params.roomId));
        const updated = await db.query.rooms.findFirst({
          where: eq(rooms.id, params.roomId),
        });
        if (!updated) {
          set.status = 500;
          return { message: "Failed to load updated room" };
        }
        return { data: updated };
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
        return { message: error instanceof Error ? error.message : "Failed to update room" };
      }
    },
    {
      params: roomParamsSchema,
      body: updateRoomSchema,
      detail: {
        tags: ["Residents"],
        summary: "Update room",
      },
      response: {
        200: roomRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .get(
    "/rooms/:roomId/beds",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.read");
        const room = await db.query.rooms.findFirst({
          where: eq(rooms.id, params.roomId),
        });
        if (!room) {
          set.status = 404;
          return { message: "Room not found" };
        }
        const data = await db.query.beds.findMany({
          where: eq(beds.roomId, params.roomId),
          orderBy: [desc(beds.createdAt)],
        });
        return { data };
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
      params: roomParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "List beds for room",
      },
      response: {
        200: bedListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .post(
    "/rooms/:roomId/beds",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const room = await db.query.rooms.findFirst({
          where: eq(rooms.id, params.roomId),
        });
        if (!room) {
          set.status = 404;
          return { message: "Room not found" };
        }
        const bedCode = body.code?.trim() || (await generateBedCode());
        const [created] = await db
          .insert(beds)
          .values({
            roomId: params.roomId,
            name: body.name,
            code: bedCode,
            status: body.status ?? "available",
            notes: body.notes,
          })
          .returning();
        set.status = 201;
        return { data: created };
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
        return { message: error instanceof Error ? error.message : "Failed to create bed" };
      }
    },
    {
      params: roomParamsSchema,
      body: createBedSchema,
      detail: {
        tags: ["Residents"],
        summary: "Create bed in room",
      },
      response: {
        201: bedRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/beds/:bedId",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const existing = await db.query.beds.findFirst({
          where: eq(beds.id, params.bedId),
        });
        if (!existing) {
          set.status = 404;
          return { message: "Bed not found" };
        }
        await db
          .update(beds)
          .set({
            name: body.name ?? existing.name,
            code: existing.code,
            status: body.status ?? existing.status,
            notes: body.notes ?? existing.notes,
            updatedAt: new Date(),
          })
          .where(eq(beds.id, params.bedId));
        const updated = await db.query.beds.findFirst({
          where: eq(beds.id, params.bedId),
        });
        if (!updated) {
          set.status = 500;
          return { message: "Failed to load updated bed" };
        }
        return { data: updated };
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
        return { message: error instanceof Error ? error.message : "Failed to update bed" };
      }
    },
    {
      params: bedParamsSchema,
      body: updateBedSchema,
      detail: {
        tags: ["Residents"],
        summary: "Update bed",
      },
      response: {
        200: bedRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .get(
    "/:id/allocations",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.read");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });
        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }
        const data = await db.query.residentRoomAllocations.findMany({
          where: eq(residentRoomAllocations.residentId, params.id),
          with: {
            room: true,
            bed: true,
          },
          orderBy: [desc(residentRoomAllocations.allocationDate)],
        });
        return { data };
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
      params: residentParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "List resident room allocations",
      },
      response: {
        200: t.Object({ data: t.Any() }),
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .post(
    "/:id/allocations",
    async ({ params, body, request, set }) => {
      try {
        const authContext = await requirePermission(request.headers, "residents.update");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });
        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }
        const room = await db.query.rooms.findFirst({
          where: eq(rooms.id, body.roomId),
        });
        if (!room) {
          set.status = 404;
          return { message: "Room not found" };
        }
        const bed = await db.query.beds.findFirst({
          where: eq(beds.id, body.bedId),
        });
        if (!bed || bed.roomId !== body.roomId) {
          set.status = 400;
          return { message: "Bed does not belong to the selected room" };
        }
        const activeResidentAllocation = await db.query.residentRoomAllocations.findFirst({
          where: and(
            eq(residentRoomAllocations.residentId, params.id),
            eq(residentRoomAllocations.status, "active"),
          ),
        });
        if (activeResidentAllocation) {
          set.status = 409;
          return { message: "Resident already has an active room allocation" };
        }
        const activeBedAllocation = await db.query.residentRoomAllocations.findFirst({
          where: and(
            eq(residentRoomAllocations.bedId, body.bedId),
            eq(residentRoomAllocations.status, "active"),
          ),
        });
        if (activeBedAllocation) {
          set.status = 409;
          return { message: "Selected bed is already assigned" };
        }
        const [created] = await db
          .insert(residentRoomAllocations)
          .values({
            residentId: params.id,
            roomId: body.roomId,
            bedId: body.bedId,
            allocationDate: new Date(body.allocationDate),
            releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
            status: body.status ?? "active",
            reason: body.reason,
            notes: body.notes,
            assignedBy: authContext.user.id,
          })
          .returning();
        set.status = 201;
        return { data: created };
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
        return { message: error instanceof Error ? error.message : "Failed to create allocation" };
      }
    },
    {
      params: residentParamsSchema,
      body: createResidentAllocationSchema,
      detail: {
        tags: ["Residents"],
        summary: "Create room allocation for resident",
      },
      response: {
        201: residentAllocationRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        409: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/:id/allocations/:allocationId",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const existing = await db.query.residentRoomAllocations.findFirst({
          where: and(
            eq(residentRoomAllocations.id, params.allocationId),
            eq(residentRoomAllocations.residentId, params.id),
          ),
        });
        if (!existing) {
          set.status = 404;
          return { message: "Resident allocation not found" };
        }
        const nextRoomId = body.roomId ?? existing.roomId;
        const nextBedId = body.bedId ?? existing.bedId;
        if (body.roomId || body.bedId) {
          const bed = await db.query.beds.findFirst({
            where: eq(beds.id, nextBedId),
          });
          if (!bed || bed.roomId !== nextRoomId) {
            set.status = 400;
            return { message: "Bed does not belong to the selected room" };
          }
        }
        await db
          .update(residentRoomAllocations)
          .set({
            roomId: nextRoomId,
            bedId: nextBedId,
            allocationDate: body.allocationDate
              ? new Date(body.allocationDate)
              : existing.allocationDate,
            releaseDate: body.releaseDate ? new Date(body.releaseDate) : existing.releaseDate,
            status: body.status ?? existing.status,
            reason: body.reason ?? existing.reason,
            notes: body.notes ?? existing.notes,
            updatedAt: new Date(),
          })
          .where(eq(residentRoomAllocations.id, params.allocationId));
        const updated = await db.query.residentRoomAllocations.findFirst({
          where: eq(residentRoomAllocations.id, params.allocationId),
        });
        if (!updated) {
          set.status = 500;
          return { message: "Failed to load updated allocation" };
        }
        return { data: updated };
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
        return { message: error instanceof Error ? error.message : "Failed to update allocation" };
      }
    },
    {
      params: residentAllocationParamsSchema,
      body: updateResidentAllocationSchema,
      detail: {
        tags: ["Residents"],
        summary: "Update resident room allocation",
      },
      response: {
        200: residentAllocationRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .get(
    "/:id/medical-profile",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.read");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });
        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }
        const profile = await db.query.residentMedicalProfiles.findFirst({
          where: eq(residentMedicalProfiles.residentId, params.id),
        });
        if (!profile) {
          set.status = 404;
          return { message: "Resident medical profile not found" };
        }
        return { data: profile };
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
      params: residentParamsSchema,
      detail: {
        tags: ["Residents"],
        summary: "Get resident medical profile",
      },
      response: {
        200: residentMedicalProfileRecordResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
  )
  .put(
    "/:id/medical-profile",
    async ({ params, body, request, set }) => {
      try {
        await requirePermission(request.headers, "residents.update");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });
        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }
        const existing = await db.query.residentMedicalProfiles.findFirst({
          where: eq(residentMedicalProfiles.residentId, params.id),
        });
        if (existing) {
          await db
            .update(residentMedicalProfiles)
            .set({
              ...body,
              updatedAt: new Date(),
            })
            .where(eq(residentMedicalProfiles.residentId, params.id));
        } else {
          await db.insert(residentMedicalProfiles).values({
            residentId: params.id,
            ...body,
          });
        }
        const profile = await db.query.residentMedicalProfiles.findFirst({
          where: eq(residentMedicalProfiles.residentId, params.id),
        });
        if (!profile) {
          set.status = 500;
          return { message: "Failed to load medical profile" };
        }
        return { data: profile };
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
        return { message: error instanceof Error ? error.message : "Failed to save medical profile" };
      }
    },
    {
      params: residentParamsSchema,
      body: upsertResidentMedicalProfileSchema,
      detail: {
        tags: ["Residents"],
        summary: "Create or update resident medical profile",
      },
      response: {
        200: residentMedicalProfileRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  );
