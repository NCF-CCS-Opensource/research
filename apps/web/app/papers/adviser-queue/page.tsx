import { listAdviserQueueContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { PaperDecision } from "./paper-decision";

export const dynamic = "force-dynamic";

export default async function AdviserQueuePage() {
  const response = await apiFetch(listAdviserQueueContract.path);
  if (!response.ok) notFound();
  const parsed = listAdviserQueueContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Adviser queue</h1>
      {parsed.data.length ? (
        <ul>
          {parsed.data.map((paper) => (
            <li key={paper.id}>
              <Link prefetch={false} href={`/papers/${paper.publicId}/read`}>
                {paper.title}
              </Link>{" "}
              — {paper.status} <PaperDecision publicId={paper.publicId} />
            </li>
          ))}
        </ul>
      ) : (
        <p>No Papers are awaiting your endorsement.</p>
      )}
    </main>
  );
}
