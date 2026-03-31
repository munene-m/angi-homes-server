import { and, desc, eq, gte, lte } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db/drizzle";
import { appointments, residents, visits } from "../db/schema";
import { requirePermission } from "../lib/access-control";

const appointmentStatusSchema = t.UnionEnum(
  ["scheduled", "completed", "cancelled", "missed"] as const,
);
const visitStatusSchema = t.UnionEnum(
  ["scheduled", "checked_in", "completed", "cancelled", "no_show"] as const,
);

const residentParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

const appointmentParamsSchema = t.Object({
  appointmentId: t.String({ format: "uuid" }),
});

const visitParamsSchema = t.Object({
  visitId: t.String({ format: "uuid" }),
});

const listAppointmentsQuerySchema = t.Object({
  residentId: t.Optional(t.String({ format: "uuid" })),
  status: t.Optional(appointmentStatusSchema),
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
});

const listVisitsQuerySchema = t.Object({
  residentId: t.Optional(t.String({ format: "uuid" })),
  status: t.Optional(visitStatusSchema),
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
});

const createAppointmentSchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 160 }),
  appointmentType: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  providerName: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  location: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  scheduledAt: t.String({ format: "date-time" }),
  endsAt: t.Optional(t.String({ format: "date-time" })),
  status: t.Optional(appointmentStatusSchema),
  notes: t.Optional(t.String()),
});

const updateAppointmentSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  appointmentType: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  providerName: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  location: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  scheduledAt: t.Optional(t.String({ format: "date-time" })),
  endsAt: t.Optional(t.String({ format: "date-time" })),
  status: t.Optional(appointmentStatusSchema),
  notes: t.Optional(t.String()),
});

const createVisitSchema = t.Object({
  visitorName: t.String({ minLength: 1, maxLength: 160 }),
  relationship: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  phoneNumber: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  email: t.Optional(t.String({ format: "email" })),
  scheduledAt: t.String({ format: "date-time" }),
  checkInAt: t.Optional(t.String({ format: "date-time" })),
  checkOutAt: t.Optional(t.String({ format: "date-time" })),
  status: t.Optional(visitStatusSchema),
  notes: t.Optional(t.String()),
});

const updateVisitSchema = t.Object({
  visitorName: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
  relationship: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  phoneNumber: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  email: t.Optional(t.String({ format: "email" })),
  scheduledAt: t.Optional(t.String({ format: "date-time" })),
  checkInAt: t.Optional(t.String({ format: "date-time" })),
  checkOutAt: t.Optional(t.String({ format: "date-time" })),
  status: t.Optional(visitStatusSchema),
  notes: t.Optional(t.String()),
});

const messageResponseSchema = t.Object({
  message: t.String(),
});

const validationErrorResponseSchema = t.Object({
  message: t.String(),
  issues: t.Any(),
});

const appointmentSchema = t.Object({
  id: t.String({ format: "uuid" }),
  residentId: t.String({ format: "uuid" }),
  title: t.String(),
  appointmentType: t.Nullable(t.String()),
  providerName: t.Nullable(t.String()),
  location: t.Nullable(t.String()),
  scheduledAt: t.Date(),
  endsAt: t.Union([t.Date(), t.Null()]),
  status: appointmentStatusSchema,
  notes: t.Nullable(t.String()),
  createdBy: t.Nullable(t.String()),
  updatedBy: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const visitSchema = t.Object({
  id: t.String({ format: "uuid" }),
  residentId: t.String({ format: "uuid" }),
  visitorName: t.String(),
  relationship: t.Nullable(t.String()),
  phoneNumber: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
  scheduledAt: t.Date(),
  checkInAt: t.Union([t.Date(), t.Null()]),
  checkOutAt: t.Union([t.Date(), t.Null()]),
  status: visitStatusSchema,
  notes: t.Nullable(t.String()),
  approvedBy: t.Nullable(t.String()),
  createdBy: t.Nullable(t.String()),
  updatedBy: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
});

const appointmentListResponseSchema = t.Object({
  data: t.Array(appointmentSchema),
});

const appointmentRecordResponseSchema = t.Object({
  data: appointmentSchema,
});

const visitListResponseSchema = t.Object({
  data: t.Array(visitSchema),
});

const visitRecordResponseSchema = t.Object({
  data: visitSchema,
});

export const appointmentsApp = new Elysia({ prefix: "/api/admin" })
  .get(
    "/appointments",
    async ({ query, request, set }) => {
      try {
        await requirePermission(request.headers, "appointments.read");
        const conditions = [];

        if (query.residentId) {
          conditions.push(eq(appointments.residentId, query.residentId));
        }
        if (query.status) {
          conditions.push(eq(appointments.status, query.status));
        }
        if (query.from) {
          conditions.push(gte(appointments.scheduledAt, new Date(query.from)));
        }
        if (query.to) {
          conditions.push(lte(appointments.scheduledAt, new Date(query.to)));
        }

        const data = await db.query.appointments.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          orderBy: [desc(appointments.scheduledAt)],
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
      query: listAppointmentsQuerySchema,
      detail: { tags: ["Appointments"], summary: "List appointments" },
      response: {
        200: appointmentListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
      },
    },
  )
  .post(
    "/residents/:id/appointments",
    async ({ params, body, request, set }) => {
      try {
        const authContext = await requirePermission(request.headers, "appointments.create");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });

        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }

        const [created] = await db
          .insert(appointments)
          .values({
            residentId: params.id,
            title: body.title,
            appointmentType: body.appointmentType,
            providerName: body.providerName,
            location: body.location,
            scheduledAt: new Date(body.scheduledAt),
            endsAt: body.endsAt ? new Date(body.endsAt) : null,
            status: body.status ?? "scheduled",
            notes: body.notes,
            createdBy: authContext.user.id,
            updatedBy: authContext.user.id,
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
        return { message: error instanceof Error ? error.message : "Failed to create appointment" };
      }
    },
    {
      params: residentParamsSchema,
      body: createAppointmentSchema,
      detail: { tags: ["Appointments"], summary: "Create appointment for resident" },
      response: {
        201: appointmentRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/appointments/:appointmentId",
    async ({ params, body, request, set }) => {
      try {
        const authContext = await requirePermission(request.headers, "appointments.update");
        const existing = await db.query.appointments.findFirst({
          where: eq(appointments.id, params.appointmentId),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Appointment not found" };
        }

        await db
          .update(appointments)
          .set({
            title: body.title ?? existing.title,
            appointmentType: body.appointmentType ?? existing.appointmentType,
            providerName: body.providerName ?? existing.providerName,
            location: body.location ?? existing.location,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : existing.scheduledAt,
            endsAt: body.endsAt ? new Date(body.endsAt) : existing.endsAt,
            status: body.status ?? existing.status,
            notes: body.notes ?? existing.notes,
            updatedBy: authContext.user.id,
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, params.appointmentId));

        const updated = await db.query.appointments.findFirst({
          where: eq(appointments.id, params.appointmentId),
        });

        if (!updated) {
          set.status = 500;
          return { message: "Failed to load updated appointment" };
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
        return { message: error instanceof Error ? error.message : "Failed to update appointment" };
      }
    },
    {
      params: appointmentParamsSchema,
      body: updateAppointmentSchema,
      detail: { tags: ["Appointments"], summary: "Update appointment" },
      response: {
        200: appointmentRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .delete(
    "/appointments/:appointmentId",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "appointments.delete");
        const existing = await db.query.appointments.findFirst({
          where: eq(appointments.id, params.appointmentId),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Appointment not found" };
        }

        await db.delete(appointments).where(eq(appointments.id, params.appointmentId));
        return { message: "Appointment deleted successfully" };
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
        return { message: error instanceof Error ? error.message : "Failed to delete appointment" };
      }
    },
    {
      params: appointmentParamsSchema,
      detail: { tags: ["Appointments"], summary: "Delete appointment" },
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
    "/visits",
    async ({ query, request, set }) => {
      try {
        await requirePermission(request.headers, "visits.read");
        const conditions = [];

        if (query.residentId) {
          conditions.push(eq(visits.residentId, query.residentId));
        }
        if (query.status) {
          conditions.push(eq(visits.status, query.status));
        }
        if (query.from) {
          conditions.push(gte(visits.scheduledAt, new Date(query.from)));
        }
        if (query.to) {
          conditions.push(lte(visits.scheduledAt, new Date(query.to)));
        }

        const data = await db.query.visits.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          orderBy: [desc(visits.scheduledAt)],
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
      query: listVisitsQuerySchema,
      detail: { tags: ["Visits"], summary: "List visits" },
      response: {
        200: visitListResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
      },
    },
  )
  .post(
    "/residents/:id/visits",
    async ({ params, body, request, set }) => {
      try {
        const authContext = await requirePermission(request.headers, "visits.create");
        const resident = await db.query.residents.findFirst({
          where: eq(residents.id, params.id),
        });

        if (!resident) {
          set.status = 404;
          return { message: "Resident not found" };
        }

        const [created] = await db
          .insert(visits)
          .values({
            residentId: params.id,
            visitorName: body.visitorName,
            relationship: body.relationship,
            phoneNumber: body.phoneNumber,
            email: body.email,
            scheduledAt: new Date(body.scheduledAt),
            checkInAt: body.checkInAt ? new Date(body.checkInAt) : null,
            checkOutAt: body.checkOutAt ? new Date(body.checkOutAt) : null,
            status: body.status ?? "scheduled",
            notes: body.notes,
            approvedBy: authContext.user.id,
            createdBy: authContext.user.id,
            updatedBy: authContext.user.id,
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
        return { message: error instanceof Error ? error.message : "Failed to create visit" };
      }
    },
    {
      params: residentParamsSchema,
      body: createVisitSchema,
      detail: { tags: ["Visits"], summary: "Create visit for resident" },
      response: {
        201: visitRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .patch(
    "/visits/:visitId",
    async ({ params, body, request, set }) => {
      try {
        const authContext = await requirePermission(request.headers, "visits.update");
        const existing = await db.query.visits.findFirst({
          where: eq(visits.id, params.visitId),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Visit not found" };
        }

        await db
          .update(visits)
          .set({
            visitorName: body.visitorName ?? existing.visitorName,
            relationship: body.relationship ?? existing.relationship,
            phoneNumber: body.phoneNumber ?? existing.phoneNumber,
            email: body.email ?? existing.email,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : existing.scheduledAt,
            checkInAt: body.checkInAt ? new Date(body.checkInAt) : existing.checkInAt,
            checkOutAt: body.checkOutAt ? new Date(body.checkOutAt) : existing.checkOutAt,
            status: body.status ?? existing.status,
            notes: body.notes ?? existing.notes,
            updatedBy: authContext.user.id,
            updatedAt: new Date(),
          })
          .where(eq(visits.id, params.visitId));

        const updated = await db.query.visits.findFirst({
          where: eq(visits.id, params.visitId),
        });

        if (!updated) {
          set.status = 500;
          return { message: "Failed to load updated visit" };
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
        return { message: error instanceof Error ? error.message : "Failed to update visit" };
      }
    },
    {
      params: visitParamsSchema,
      body: updateVisitSchema,
      detail: { tags: ["Visits"], summary: "Update visit" },
      response: {
        200: visitRecordResponseSchema,
        400: validationErrorResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  )
  .delete(
    "/visits/:visitId",
    async ({ params, request, set }) => {
      try {
        await requirePermission(request.headers, "visits.delete");
        const existing = await db.query.visits.findFirst({
          where: eq(visits.id, params.visitId),
        });

        if (!existing) {
          set.status = 404;
          return { message: "Visit not found" };
        }

        await db.delete(visits).where(eq(visits.id, params.visitId));
        return { message: "Visit deleted successfully" };
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
        return { message: error instanceof Error ? error.message : "Failed to delete visit" };
      }
    },
    {
      params: visitParamsSchema,
      detail: { tags: ["Visits"], summary: "Delete visit" },
      response: {
        200: messageResponseSchema,
        401: messageResponseSchema,
        403: messageResponseSchema,
        404: messageResponseSchema,
        500: messageResponseSchema,
      },
    },
  );
