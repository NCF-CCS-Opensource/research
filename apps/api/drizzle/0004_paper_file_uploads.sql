CREATE TYPE "paper_file_status" AS ENUM ('PENDING', 'CLEAN', 'REJECTED', 'FAILED');
CREATE TABLE "paper_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "paper_id" uuid REFERENCES "papers"("id") ON DELETE SET NULL,
  "version_id" uuid REFERENCES "paper_versions"("id") ON DELETE SET NULL,
  "owner_id" uuid NOT NULL REFERENCES "accounts"("id"),
  "object_key" varchar(100) NOT NULL UNIQUE,
  "filename" varchar(255) NOT NULL,
  "byte_count" integer NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "status" "paper_file_status" NOT NULL DEFAULT 'PENDING',
  "reason" varchar(40),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "paper_file_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" uuid NOT NULL UNIQUE REFERENCES "paper_files"("id") ON DELETE CASCADE,
  "attempts" integer NOT NULL DEFAULT 0,
  "available_at" timestamptz NOT NULL DEFAULT now(),
  "lease_until" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "paper_file_jobs_claim_idx" ON "paper_file_jobs" ("available_at", "lease_until");
CREATE TABLE "paper_file_upload_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "paper_file_upload_attempts_owner_time_idx" ON "paper_file_upload_attempts" ("owner_id", "created_at");
ALTER TABLE "paper_versions" ADD COLUMN "pdf_file_id" uuid REFERENCES "paper_files"("id") ON DELETE SET NULL;
