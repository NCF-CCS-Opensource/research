import Link from "next/link";
import { listBooksContract } from "@repo/contracts";
import { apiFetch } from "../../lib/backend";

export const dynamic = "force-dynamic";
export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const response = await apiFetch(
    `${listBooksContract.path}?q=${encodeURIComponent(q)}`,
  );
  const parsed = response.ok
    ? listBooksContract.response.safeParse((await response.json())?.data)
    : null;
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Books</h1>
      <form action="/books">
        <label>
          Search Books <input name="q" defaultValue={q} />
        </label>
        <button type="submit">Search</button>
      </form>
      {parsed?.success && parsed.data.length ? (
        <ul>
          {parsed.data.map((book) => (
            <li key={book.publicId}>
              <Link href={`/books/${book.publicId}`}>{book.title}</Link> —{" "}
              {book.authors.join(", ")} · {book.year}
            </li>
          ))}
        </ul>
      ) : (
        <p>No Books found.</p>
      )}
    </main>
  );
}
