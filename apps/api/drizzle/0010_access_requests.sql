CREATE TYPE access_request_status AS ENUM ('pending', 'approved', 'denied', 'cancelled', 'expired');
CREATE TABLE access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  purpose text NOT NULL,
  status access_request_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  decided_by uuid REFERENCES accounts(id),
  decision_reason text,
  grant_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE UNIQUE INDEX access_requests_pending_unique ON access_requests(account_id, paper_id) WHERE status = 'pending';
CREATE INDEX access_requests_account_created_idx ON access_requests(account_id, created_at);
CREATE INDEX access_requests_paper_created_idx ON access_requests(paper_id, created_at);
CREATE TABLE access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES access_requests(id),
  paper_id uuid NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX access_grants_account_paper_idx ON access_grants(account_id, paper_id, expires_at);
