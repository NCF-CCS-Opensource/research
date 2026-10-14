import Link from "next/link";
import { listBookQueueContract } from "@repo/contracts";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { decideBook, restoreBook, withdrawBook } from "../manage-actions";

export const dynamic = "force-dynamic";

export default async function BookPublicationQueuePage() {
  const response = await apiFetch(listBookQueueContract.path);
  if (!response.ok) notFound();
  const parsed = listBookQueueContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed?.success) notFound();
  const submitted = parsed.data.filter((book) => book.status === "submitted");
  const catalog = parsed.data.filter((book) =>
    ["published", "rejected", "withdrawn"].includes(book.status),
  );
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Book publication queue</h1>
      {submitted.length ? (
        submitted.map((book) => (
          <section key={book.publicId}>
            <h2>{book.title}</h2>
            <p>
              <Link href={`/books/${book.publicId}/edit`}>Edit details</Link>
            </p>
            <p>
              {book.authors.join(", ")} · {book.year} · Owner submission
            </p>
            <form action={decideBook}>
              <input type="hidden" name="publicId" value={book.publicId} />
              <button type="submit" name="decision" value="publish">
                Publish
              </button>
              <label>
                Rejection reason <input name="reason" maxLength={1000} />
              </label>
              <button type="submit" name="decision" value="reject">
                Reject
              </button>
            </form>
          </section>
        ))
      ) : (
        <p>No submitted Books are awaiting review.</p>
      )}
      <h2>Other Books</h2>
      {catalog.length ? (
        <ul>
          {catalog.map((book) => (
            <li key={book.publicId}>
              {book.status === "published" ? (
                <Link href={`/books/${book.publicId}`}>{book.title}</Link>
              ) : (
                book.title
              )}{" "}
              — {book.status} ·{" "}
              <Link href={`/books/${book.publicId}/edit`}>Edit details</Link>
              {book.rejectionReason && <p>Reason: {book.rejectionReason}</p>}
              {book.status !== "rejected" && (
                <form
                  action={
                    book.status === "published" ? withdrawBook : restoreBook
                  }
                >
                  <input type="hidden" name="publicId" value={book.publicId} />
                  <button type="submit">
                    {book.status === "published" ? "Withdraw" : "Restore"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No published Books.</p>
      )}
    </main>
  );
}
