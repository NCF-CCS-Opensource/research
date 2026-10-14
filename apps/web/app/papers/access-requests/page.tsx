import { listMyAccessRequestsContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";

export const dynamic = "force-dynamic";
export default async function AccessRequestsPage() {
  const response = await apiFetch(listMyAccessRequestsContract.path);
  if (!response.ok) notFound();
  const parsed = listMyAccessRequestsContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>My Access Requests</h1>
      {parsed.data.length ? (
        <ul>
          {parsed.data.map((request) => (
            <li key={request.id}>
              <Link href={`/papers/${encodeURIComponent(request.publicId)}`}>
                {request.paperTitle}
              </Link>{" "}
              — {request.status}
              {request.status === "pending" &&
                ` (expires ${new Date(request.expiresAt).toLocaleString()})`}
              {request.grantExpiresAt &&
                ` (access until ${new Date(request.grantExpiresAt).toLocaleString()})`}
              {request.decisionReason && (
                <p>Reason: {request.decisionReason}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>You have no Access Requests.</p>
      )}
    </main>
  );
}
