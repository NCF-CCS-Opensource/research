CREATE TYPE "public"."paper_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."research_type" AS ENUM('THESIS', 'CAPSTONE', 'RESEARCH_PAPER', 'PROJECT_REPORT');--> statement-breakpoint
CREATE TABLE "paper_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paper_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"lock_version" integer DEFAULT 0 NOT NULL,
	"title" varchar(300) NOT NULL,
	"abstract" text NOT NULL,
	"year" integer NOT NULL,
	"research_type" "research_type" NOT NULL,
	"keywords" text[] NOT NULL,
	"authors" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"owner_id" uuid NOT NULL,
	"adviser_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"status" "paper_status" DEFAULT 'draft' NOT NULL,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "papers_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "paper_versions" ADD CONSTRAINT "paper_versions_paper_id_papers_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."papers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_owner_id_accounts_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_adviser_id_accounts_id_fk" FOREIGN KEY ("adviser_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "papers" ADD CONSTRAINT "papers_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
