CREATE TYPE "public"."staff_performance_rating" AS ENUM('poor', 'fair', 'good', 'very_good', 'excellent');--> statement-breakpoint
CREATE TYPE "public"."staff_shift_status" AS ENUM('scheduled', 'completed', 'missed', 'cancelled');--> statement-breakpoint
CREATE TABLE "staff_performance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_user_id" text NOT NULL,
	"reviewer_user_id" text,
	"review_date" date NOT NULL,
	"rating" "staff_performance_rating" NOT NULL,
	"strengths" text,
	"improvements" text,
	"summary" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_user_id" text NOT NULL,
	"shift_date" date NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10) NOT NULL,
	"department" varchar(120),
	"role_label" varchar(120),
	"status" "staff_shift_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"assigned_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_performance_reviews" ADD CONSTRAINT "staff_performance_reviews_staff_user_id_user_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_performance_reviews" ADD CONSTRAINT "staff_performance_reviews_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_staff_user_id_user_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_performance_reviews_staff_user_id_idx" ON "staff_performance_reviews" USING btree ("staff_user_id");--> statement-breakpoint
CREATE INDEX "staff_performance_reviews_review_date_idx" ON "staff_performance_reviews" USING btree ("review_date");--> statement-breakpoint
CREATE INDEX "staff_shifts_staff_user_id_idx" ON "staff_shifts" USING btree ("staff_user_id");--> statement-breakpoint
CREATE INDEX "staff_shifts_shift_date_idx" ON "staff_shifts" USING btree ("shift_date");--> statement-breakpoint
CREATE INDEX "staff_shifts_status_idx" ON "staff_shifts" USING btree ("status");