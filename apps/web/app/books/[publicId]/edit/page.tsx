import { getManagedBookContract } from "@repo/contracts";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../../lib/backend";
import { updateBook } from "../../manage-actions";

export const dynamic = "force-dynamic";

export default async function EditBookPage({
  params,
}: Readonly<{ params: Promise<{ publicId: string }> }>) {
  const { publicId } = await params;
  const response = await apiFetch(
    getManagedBookContract.path.replace(
      ":publicId",
      encodeURIComponent(publicId),
    ),
  );
  if (!response.ok) notFound();
  const parsed = getManagedBookContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed?.success) notFound();
  const book = parsed.data;
  return (
    <main style={{ padding: "2rem", maxWidth: 720 }}>
      <h1>Edit Book details</h1>
      <p>Status: {book.status}. The uploaded PDF cannot be replaced.</p>
      <form action={updateBook} style={{ display: "grid", gap: ".75rem" }}>
        <input type="hidden" name="publicId" value={book.publicId} />
        <label>
          Title{" "}
          <input
            required
            name="title"
            maxLength={300}
            defaultValue={book.title}
          />
        </label>
        <label>
          Authors, in order (one per line){" "}
          <textarea
            required
            name="authors"
            defaultValue={book.authors.join("\n")}
          />
        </label>
        <label>
          Edition year{" "}
          <input
            required
            type="number"
            name="year"
            min="1"
            max={new Date().getFullYear()}
            defaultValue={book.year}
          />
        </label>
        <label>
          Licence{" "}
          <input
            required
            name="licence"
            maxLength={100}
            defaultValue={book.licence}
          />
        </label>
        <label>
          Source URL{" "}
          <input type="url" name="sourceUrl" defaultValue={book.sourceUrl} />
        </label>
        <label>
          Publisher{" "}
          <input
            name="publisher"
            maxLength={255}
            defaultValue={book.publisher}
          />
        </label>
        <label>
          Edition{" "}
          <input name="edition" maxLength={100} defaultValue={book.edition} />
        </label>
        <label>
          ISBN <input name="isbn" maxLength={32} defaultValue={book.isbn} />
        </label>
        <label>
          Description{" "}
          <textarea
            name="description"
            maxLength={5000}
            defaultValue={book.description}
          />
        </label>
        <label>
          Keywords (one per line){" "}
          <textarea name="keywords" defaultValue={book.keywords.join("\n")} />
        </label>
        <button type="submit">Save details</button>
      </form>
    </main>
  );
}
