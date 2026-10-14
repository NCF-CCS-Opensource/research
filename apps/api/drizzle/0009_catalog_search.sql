CREATE INDEX paper_versions_catalog_search_idx ON paper_versions USING gin (
  setweight(to_tsvector('english', title), 'A') ||
  setweight(to_tsvector('english', abstract), 'C') ||
  setweight(to_tsvector('simple', authors::text), 'B') ||
  setweight(to_tsvector('simple', array_to_string(keywords, ' ')), 'A')
);
