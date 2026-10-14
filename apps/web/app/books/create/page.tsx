import { createBook } from "./actions";
import { getCurrentIdentity } from "../../../lib/backend";
import { notFound } from "next/navigation";

export default async function CreateBookPage() {
  const identity = await getCurrentIdentity();
  if (identity.state !== "active") notFound();
  return (
    <main style={{ padding: "2rem", maxWidth: 720 }}>
      <h1>Upload a Book</h1>
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
          <select required name="licence" defaultValue="CC BY">
            <option>CC0</option>
            <option>CC BY</option>
            <option>CC BY-SA</option>
            <option>CC BY-NC</option>
            <option>CC BY-NC-SA</option>
            <option>CC BY-ND</option>
            <option>CC BY-NC-ND</option>
            <option>public domain</option>
            <option value="OTHER">Other named open licence</option>
          </select>
        </label>
        <label>
          Other named open licence (required when selected above)
          <input name="otherLicenceName" maxLength={100} />
        </label>
        <label>
          <input required type="checkbox" name="openLicenceConfirmed" />I
          confirm this Book is released under the listed open licence or is
          public domain, and may be copied and shared. I will not upload a
          purchased copy without redistribution rights.
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
        <button type="submit">Submit Book</button>
      </form>
    </main>
  );
}
