import {
  listMyAccessGrantsContract,
  listMyAccessRequestsContract,
} from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";

export const dynamic = "force-dynamic";
export default async function AccessRequestsPage() {
  const [response, grantsResponse] = await Promise.all([
    apiFetch(listMyAccessRequestsContract.path),
    apiFetch(listMyAccessGrantsContract.path),
  ]);
  if (!response.ok || !grantsResponse.ok) notFound();
  const parsed = listMyAccessRequestsContract.response.safeParse(
    (await response.json())?.data,
  );
  const grants = listMyAccessGrantsContract.response.safeParse(
    (await grantsResponse.json())?.data,
  );
  if (!parsed.success || !grants.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>My Access Requests</h1>
      <h2>My Access Grants</h2>
      {grants.data.length ? (
        <ul>
          {grants.data.map((grant) => (
            <li key={grant.id}>
              <Link href={`/papers/${encodeURIComponent(grant.publicId)}`}>
                {grant.paperTitle}
              </Link>
              {` — expires ${new Date(grant.expiresAt).toLocaleString()}`}
              {grant.revokedAt && <p>Revoked: {grant.revocationReason}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p>You have no Access Grants.</p>
      )}
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
