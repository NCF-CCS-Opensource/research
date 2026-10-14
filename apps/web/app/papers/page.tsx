import { listMyPapersContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../lib/backend";

export const dynamic = "force-dynamic";

export default async function MyPapersPage() {
  const response = await apiFetch(listMyPapersContract.path);
  if (!response.ok) notFound();
  const parsed = listMyPapersContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>My Papers</h1>
      {parsed.data.length ? (
        <ul>
          {parsed.data.map((paper) => (
            <li key={paper.id}>
              <Link href={`/papers/${paper.publicId}`}>{paper.title}</Link> —{" "}
              {paper.status}
            </li>
          ))}
        </ul>
      ) : (
        <p>You do not have any Paper drafts yet.</p>
      )}
    </main>
  );
}
