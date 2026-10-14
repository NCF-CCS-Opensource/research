CREATE TYPE "email_job_status" AS ENUM ('pending', 'processing', 'sent', 'failed');
CREATE TABLE "email_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" varchar(50) NOT NULL,
	"recipient_email" varchar(320) NOT NULL,
	"recipient_name" varchar(255) NOT NULL,
	"paper_public_id" varchar(32) NOT NULL,
	"paper_title" varchar(300) NOT NULL,
	"details" jsonb,
	"status" "email_job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"last_error" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
CREATE INDEX "email_jobs_claim_idx" ON "email_jobs" USING btree ("status", "available_at");
