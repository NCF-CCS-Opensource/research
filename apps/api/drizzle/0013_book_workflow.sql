CREATE TYPE book_status AS ENUM ('draft', 'submitted', 'published', 'rejected', 'withdrawn');
ALTER TABLE books ADD COLUMN status book_status NOT NULL DEFAULT 'published';
ALTER TABLE books ADD COLUMN rejection_reason text;
ALTER TABLE books ADD COLUMN withdrawn_at timestamptz;
ALTER TABLE books ALTER COLUMN published_at DROP NOT NULL;
ALTER TABLE email_jobs ALTER COLUMN paper_public_id DROP NOT NULL;
ALTER TABLE email_jobs ADD COLUMN book_public_id varchar(32);
