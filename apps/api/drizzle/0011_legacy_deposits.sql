ALTER TABLE "papers" ALTER COLUMN "adviser_id" DROP NOT NULL;
ALTER TABLE "papers" ADD COLUMN "legacy_deposit" boolean DEFAULT false NOT NULL;
