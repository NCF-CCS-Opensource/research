CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "programs_name_unique" UNIQUE("name")
);

--> statement-breakpoint
INSERT INTO "programs" ("name") VALUES ('BS Computer Science') ON CONFLICT ("name") DO NOTHING;
