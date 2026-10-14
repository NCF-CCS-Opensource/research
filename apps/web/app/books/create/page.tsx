import { createBook } from "./actions";
import { getCurrentIdentity } from "../../../lib/backend";
import { notFound } from "next/navigation";

export default async function CreateBookPage() {
  const identity = await getCurrentIdentity();
  if (identity.state !== "active" || identity.account.role !== "COORDINATOR")
    notFound();
  return (
    <main style={{ padding: "2rem", maxWidth: 720 }}>
      <h1>Add a Book</h1>
      <p>
        Only openly licensed and public-domain Books may be shared here. A
        purchased copy grants no right to copy and redistribute it.
      </p>
      <form
        action={createBook}
        encType="multipart/form-data"
        style={{ display: "grid", gap: ".75rem" }}
      >
        <label>
          Title
          <input required name="title" />
        </label>
        <label>
          Authors, in order (one per line)
          <textarea required name="authors" />
        </label>
        <label>
          Edition year
          <input
            required
            type="number"
            name="year"
            min="1"
            max={new Date().getFullYear()}
          />
        </label>
        <label>
          Licence
          <input
            required
            name="licence"
            placeholder="CC BY 4.0 or public domain"
          />
        </label>
        <label>
          Source URL
          <input type="url" name="sourceUrl" />
        </label>
        <label>
          Publisher
          <input name="publisher" />
        </label>
        <label>
          Edition
          <input name="edition" />
        </label>
        <label>
          ISBN
          <input name="isbn" />
        </label>
        <label>
          Description
          <textarea name="description" maxLength={5000} />
        </label>
        <label>
          Keywords, one per line
          <textarea name="keywords" />
        </label>
        <label>
          Book PDF
          <input
            required
            type="file"
            name="file"
            accept="application/pdf,.pdf"
          />
        </label>
        <button type="submit">Publish Book</button>
      </form>
    </main>
  );
}
