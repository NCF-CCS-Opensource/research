ALTER TABLE paper_versions
  ADD COLUMN search_document tsvector;

UPDATE paper_versions
SET search_document =
  setweight(to_tsvector('english', title), 'A') ||
  setweight(to_tsvector('english', abstract), 'C') ||
  setweight(to_tsvector('simple', authors::text), 'B') ||
  setweight(to_tsvector('simple', array_to_string(keywords, ' ')), 'A')
WHERE search_document IS NULL;

ALTER TABLE paper_versions
  ALTER COLUMN search_document SET DEFAULT ''::tsvector,
  ALTER COLUMN search_document SET NOT NULL;

CREATE FUNCTION update_paper_version_search_document() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_document :=
    setweight(to_tsvector('english', NEW.title), 'A') ||
    setweight(to_tsvector('english', NEW.abstract), 'C') ||
    setweight(to_tsvector('simple', NEW.authors::text), 'B') ||
    setweight(to_tsvector('simple', array_to_string(NEW.keywords, ' ')), 'A');
  RETURN NEW;
END;
$$;

CREATE TRIGGER paper_version_search_document_update
  BEFORE INSERT OR UPDATE OF title, abstract, authors, keywords
  ON paper_versions
  FOR EACH ROW EXECUTE FUNCTION update_paper_version_search_document();

CREATE INDEX paper_versions_catalog_search_idx
  ON paper_versions USING gin (search_document);
