ALTER TABLE access_grants ADD COLUMN version_id uuid REFERENCES paper_versions(id);
UPDATE access_grants g SET version_id = p.current_version_id FROM papers p WHERE p.id = g.paper_id;
ALTER TABLE access_grants ALTER COLUMN version_id SET NOT NULL;
ALTER TABLE access_grants ADD COLUMN revoked_at timestamptz;
ALTER TABLE access_grants ADD COLUMN revocation_reason text;
