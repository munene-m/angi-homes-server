import { and, desc, eq, ilike, or } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/drizzle";
import { residents } from "../db/schema";
import { requirePermission } from "../lib/access-control";

const residentBaseSchema = t.Object({
  residentNumber: t.String({ minLength: 1, maxLength: 60 }),
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

const residentParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

const listResidentsQuerySchema = t.Object({
  q: t.Optional(t.String()),
  status: t.Optional(
    t.UnionEnum(["pending", "active", "discharged", "deceased"] as const),
  ),
  includeArchived: t.Optional(t.Boolean()),
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
      const conditions = [];

      if (!filters.includeArchived) {
        conditions.push(eq(residents.isArchived, false));
      }

      if (filters.status) {
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

      const [created] = await db
        .insert(residents)
        .values({
          ...parsed,
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
  );
