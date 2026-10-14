import { formatBookCitations, getPublicBookContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";

export const dynamic = "force-dynamic";
export default async function BookPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const path = getPublicBookContract.path.replace(
    ":publicId",
    encodeURIComponent(publicId),
  );
  const response = await apiFetch(path);
  const parsed = response.ok
    ? getPublicBookContract.response.safeParse((await response.json())?.data)
    : null;
  if (!parsed?.success) notFound();
  const book = parsed.data;
  const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3001";
  const content = `${apiOrigin}/v1/api/books/content/${encodeURIComponent(publicId)}`;
  const download = `${apiOrigin}/v1/api/books/download/${encodeURIComponent(publicId)}`;
  const url = new URL(
    `/books/${encodeURIComponent(publicId)}`,
    process.env.WEB_ORIGIN ?? "http://localhost:3000",
  ).toString();
  const citations = formatBookCitations(book, url);
  return (
    <main style={{ padding: "2rem", display: "grid", gap: "1rem" }}>
      <h1>{book.title}</h1>
      <p>{book.authors.join(", ")}</p>
      <p>
        <strong>Licence:</strong> {book.licence}
        {book.sourceUrl && (
          <>
            {" "}
            · <a href={book.sourceUrl}>Source</a>
          </>
        )}
      </p>
      <iframe
        title={`Read ${book.title}`}
        src={content}
        style={{ width: "100%", height: "75vh", border: "1px solid #bbb" }}
      />
      <a href={download}>Download PDF</a>
      <h2>Citations</h2>
      <p>APA 7: {citations.apa}</p>
      <p>IEEE: {citations.ieee}</p>
      <p>{citations.warnings.join(" ")}</p>
      <Link href={`/books/${encodeURIComponent(publicId)}/bibtex`}>
        Download BibTeX
      </Link>
    </main>
  );
}
