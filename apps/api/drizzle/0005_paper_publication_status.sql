CREATE TYPE "paper_publication_status" AS ENUM ('unpublished', 'published', 'withdrawn');
ALTER TABLE "papers" ADD COLUMN "publication_status" "paper_publication_status" DEFAULT 'unpublished' NOT NULL;
