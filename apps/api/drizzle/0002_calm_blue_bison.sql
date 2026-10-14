CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"default_access_grant_days" integer DEFAULT 7 NOT NULL,
	"maximum_access_grant_days" integer DEFAULT 30 NOT NULL,
	"pending_request_days" integer DEFAULT 14 NOT NULL,
	"institution_name" text DEFAULT 'Naga College Foundation' NOT NULL,
	CONSTRAINT "settings_singleton_id" CHECK ("id" = 1),
	CONSTRAINT "settings_default_grant_min" CHECK ("default_access_grant_days" >= 1),
	CONSTRAINT "settings_max_grant_min" CHECK ("maximum_access_grant_days" >= 1),
	CONSTRAINT "settings_pending_days_min" CHECK ("pending_request_days" >= 1),
	CONSTRAINT "settings_grant_range" CHECK ("default_access_grant_days" <= "maximum_access_grant_days")
);
INSERT INTO "settings" DEFAULT VALUES;
CREATE TABLE "deposit_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" serial NOT NULL UNIQUE,
	"text" text NOT NULL,
	"published_by" uuid NOT NULL REFERENCES "accounts"("id"),
	"published_at" timestamptz DEFAULT now() NOT NULL
);
