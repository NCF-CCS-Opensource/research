CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "programs" DROP CONSTRAINT "programs_name_unique";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_program_id_programs_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "keywords_name_lower_idx" ON "keywords" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_lower_idx" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "programs_name_lower_idx" ON "programs" USING btree (lower("name"));