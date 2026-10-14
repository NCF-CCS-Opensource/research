ALTER TYPE paper_status ADD VALUE IF NOT EXISTS 'endorsed';
ALTER TYPE paper_status ADD VALUE IF NOT EXISTS 'revision_requested';
ALTER TYPE paper_status ADD VALUE IF NOT EXISTS 'rejected';

CREATE TABLE paper_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES accounts(id),
  decision varchar(40) NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX paper_decisions_paper_time_idx ON paper_decisions (paper_id, created_at);

CREATE TABLE deposit_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  notice_version integer NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);
