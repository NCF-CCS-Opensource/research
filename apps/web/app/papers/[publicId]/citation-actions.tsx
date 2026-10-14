"use client";

import { formatPaperCitations, type PublishedPaper } from "@repo/contracts";

export function CitationActions({
  paper,
  url,
}: {
  paper: PublishedPaper;
  url: string;
}) {
  const citations = formatPaperCitations(paper, url);
  return (
    <section aria-label="Citations" style={{ display: "grid", gap: ".75rem" }}>
      <h2>Cite this Paper</h2>
      <p>{citations.apa}</p>
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(citations.apa)}
      >
        Copy APA 7
      </button>
      <p>{citations.ieee}</p>
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(citations.ieee)}
      >
        Copy IEEE
      </button>
      <a href={`/papers/${encodeURIComponent(paper.publicId)}/bibtex`}>
        Download BibTeX
      </a>
      {citations.warnings.map((warning) => (
        <p role="status" key={warning}>
          Warning: {warning}
        </p>
      ))}
    </section>
  );
}
