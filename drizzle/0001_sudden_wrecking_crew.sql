CREATE TYPE "public"."resident_admission_status" AS ENUM('planned', 'admitted', 'discharged', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."resident_allocation_status" AS ENUM('active', 'transferred', 'ended');--> statement-breakpoint
CREATE TYPE "public"."bed_status" AS ENUM('available', 'occupied', 'maintenance', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."resident_contact_type" AS ENUM('next_of_kin', 'guardian', 'family', 'emergency', 'other');--> statement-breakpoint
CREATE TYPE "public"."resident_document_type" AS ENUM('id', 'insurance', 'medical', 'consent', 'other');--> statement-breakpoint
CREATE TYPE "public"."resident_mobility_status" AS ENUM('independent', 'assisted', 'wheelchair', 'bedridden');--> statement-breakpoint
CREATE TYPE "public"."resident_gender" AS ENUM('male', 'female', 'other', 'undisclosed');--> statement-breakpoint
CREATE TYPE "public"."resident_status" AS ENUM('pending', 'active', 'discharged', 'deceased');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('available', 'occupied', 'maintenance', 'inactive');--> statement-breakpoint
CREATE TABLE "beds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(60) NOT NULL,
	"status" "bed_status" DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beds_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "resident_admissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"admission_date" timestamp NOT NULL,
	"discharge_date" timestamp,
	"status" "resident_admission_status" DEFAULT 'planned' NOT NULL,
	"source" varchar(120),
	"reason" text,
	"care_level" varchar(120),
	"physician_name" varchar(160),
	"discharge_reason" text,
	"discharge_notes" text,
	"admitted_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resident_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"type" "resident_contact_type" DEFAULT 'family' NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"relationship" varchar(120),
	"phone_number" varchar(40),
	"alternate_phone_number" varchar(40),
	"email" varchar(255),
	"address" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"can_receive_updates" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resident_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"document_type" "resident_document_type" DEFAULT 'other' NOT NULL,
	"title" varchar(160) NOT NULL,
	"file_name" varchar(255),
	"file_url" text NOT NULL,
	"mime_type" varchar(120),
	"notes" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resident_medical_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"blood_group" varchar(10),
	"genotype" varchar(10),
	"allergies" text,
	"chronic_conditions" text,
	"current_diagnoses" text,
	"dietary_notes" text,
	"mobility_status" "resident_mobility_status",
	"disability_notes" text,
	"mental_health_notes" text,
	"fall_risk_notes" text,
	"care_notes" text,
	"emergency_medical_notes" text,
	"primary_physician_name" varchar(160),
	"primary_physician_phone" varchar(40),
	"insurance_provider" varchar(160),
	"insurance_member_number" varchar(160),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resident_medical_profiles_resident_id_unique" UNIQUE("resident_id")
);
--> statement-breakpoint
CREATE TABLE "resident_room_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"bed_id" uuid NOT NULL,
	"allocation_date" timestamp NOT NULL,
	"release_date" timestamp,
	"status" "resident_allocation_status" DEFAULT 'active' NOT NULL,
	"reason" text,
	"notes" text,
	"assigned_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "residents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_number" varchar(60) NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"preferred_name" varchar(120),
	"gender" "resident_gender" DEFAULT 'undisclosed' NOT NULL,
	"date_of_birth" date,
	"national_id_number" varchar(120),
	"passport_number" varchar(120),
	"status" "resident_status" DEFAULT 'pending' NOT NULL,
	"profile_image" text,
	"phone_number" varchar(40),
	"email" varchar(255),
	"address" text,
	"city" varchar(120),
	"state" varchar(120),
	"country" varchar(120),
	"postal_code" varchar(40),
	"religion" varchar(120),
	"language" varchar(120),
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "residents_resident_number_unique" UNIQUE("resident_number")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(60) NOT NULL,
	"floor" varchar(60),
	"wing" varchar(60),
	"room_type" varchar(60),
	"status" "room_status" DEFAULT 'available' NOT NULL,
	"capacity" varchar(20),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_admissions" ADD CONSTRAINT "resident_admissions_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_admissions" ADD CONSTRAINT "resident_admissions_admitted_by_user_id_fk" FOREIGN KEY ("admitted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_contacts" ADD CONSTRAINT "resident_contacts_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_medical_profiles" ADD CONSTRAINT "resident_medical_profiles_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_room_allocations" ADD CONSTRAINT "resident_room_allocations_resident_id_residents_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."residents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_room_allocations" ADD CONSTRAINT "resident_room_allocations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_room_allocations" ADD CONSTRAINT "resident_room_allocations_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_room_allocations" ADD CONSTRAINT "resident_room_allocations_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beds_room_id_idx" ON "beds" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "beds_status_idx" ON "beds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resident_admissions_resident_id_idx" ON "resident_admissions" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "resident_admissions_status_idx" ON "resident_admissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resident_contacts_resident_id_idx" ON "resident_contacts" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "resident_contacts_type_idx" ON "resident_contacts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "resident_documents_resident_id_idx" ON "resident_documents" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "resident_documents_document_type_idx" ON "resident_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "resident_medical_profiles_resident_id_idx" ON "resident_medical_profiles" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "resident_room_allocations_resident_id_idx" ON "resident_room_allocations" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "resident_room_allocations_room_id_idx" ON "resident_room_allocations" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "resident_room_allocations_bed_id_idx" ON "resident_room_allocations" USING btree ("bed_id");--> statement-breakpoint
CREATE INDEX "resident_room_allocations_status_idx" ON "resident_room_allocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "residents_status_idx" ON "residents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "residents_last_name_idx" ON "residents" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "rooms_status_idx" ON "rooms" USING btree ("status");