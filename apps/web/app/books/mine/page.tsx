import Link from "next/link";
import { listMyBooksContract } from "@repo/contracts";
import { notFound } from "next/navigation";
import { apiFetch, getCurrentIdentity } from "../../../lib/backend";

export const dynamic = "force-dynamic";

export default async function MyBooksPage() {
  const identity = await getCurrentIdentity();
  if (identity.state !== "active") notFound();
  const response = await apiFetch(listMyBooksContract.path);
  if (!response.ok) notFound();
  const parsed = listMyBooksContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed?.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>My Books</h1>
      <p>
        <Link href="/books/create">Upload a Book</Link>
      </p>
      {parsed.data.length ? (
        <ul>
          {parsed.data.map((book) => (
            <li key={book.publicId}>
              <Link href={`/books/${book.publicId}`}>{book.title}</Link> —{" "}
              {book.status}
              {book.rejectionReason && <p>Reason: {book.rejectionReason}</p>}
              {book.status === "submitted" && (
                <p>A Coordinator will review this Book.</p>
              )}
              {book.status === "draft" ||
              book.status === "submitted" ||
              identity.account.role === "COORDINATOR" ? (
                <p>
                  <Link href={`/books/${book.publicId}/edit`}>
                    Edit details
                  </Link>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>You have not uploaded any Books.</p>
      )}
    </main>
  );
}
