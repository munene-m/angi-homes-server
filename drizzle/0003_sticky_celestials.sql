CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'missed');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"appointment_type" varchar(120),
	"provider_name" varchar(160),
	"location" varchar(160),
	"scheduled_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"visitor_name" varchar(160) NOT NULL,
	"relationship" varchar(120),
	"phone_number" varchar(40),
	"email" varchar(255),
	"scheduled_at" timestamp NOT NULL,
	"check_in_at" timestamp,
	"check_out_at" timestamp,
	"status" "visit_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"approved_by" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_resident_id_idx" ON "appointments" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "visits_resident_id_idx" ON "visits" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "visits_status_idx" ON "visits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "visits_scheduled_at_idx" ON "visits" USING btree ("scheduled_at");