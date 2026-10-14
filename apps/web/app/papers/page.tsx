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
      <p>
        <Link href="/papers/adviser-queue">Adviser queue</Link>
      </p>
      {parsed.data.length ? (
        <ul>
          {parsed.data.map((paper) => (
            <li key={paper.id}>
              <Link href={`/papers/${paper.publicId}`}>{paper.title}</Link> —{" "}
              {paper.status}
              {paper.decisionHistory
                .filter((item) => item.reason)
                .map((item, index) => (
                  <p key={`${item.createdAt}-${index}`}>
                    {item.decision}: {item.reason}
                  </p>
                ))}
            </li>
          ))}
        </ul>
      ) : (
        <p>You do not have any Paper drafts yet.</p>
      )}
    </main>
  );
}
