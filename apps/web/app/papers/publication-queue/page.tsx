import { listPublicationQueueContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { publishPaper } from "./actions";

export const dynamic = "force-dynamic";

export default async function PublicationQueuePage() {
  const response = await apiFetch(listPublicationQueueContract.path);
  if (!response.ok) notFound();
  const parsed = listPublicationQueueContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Publication queue</h1>
      {parsed.data.length ? (
        <ul>
          {parsed.data.map((paper) => (
            <li key={paper.id}>
              <Link href={`/papers/${paper.publicId}`}>{paper.title}</Link> —{" "}
              {paper.authors.map((author) => author.displayName).join(", ")}
              <form action={publishPaper}>
                <input type="hidden" name="publicId" value={paper.publicId} />
                <button type="submit">Publish</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p>No endorsed Papers are awaiting publication.</p>
      )}
    </main>
  );
}
