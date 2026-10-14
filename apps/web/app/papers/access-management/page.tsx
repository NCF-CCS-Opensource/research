import {
  listAccessGrantQueueContract,
  listAccessRequestQueueContract,
} from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { AccessDecision } from "./access-decision";
import { GrantRevoke } from "./grant-revoke";

export const dynamic = "force-dynamic";
export default async function AccessManagementPage() {
  const [response, grantsResponse] = await Promise.all([
    apiFetch(listAccessRequestQueueContract.path),
    apiFetch(listAccessGrantQueueContract.path),
  ]);
  if (!response.ok || !grantsResponse.ok) notFound();
  const parsed = listAccessRequestQueueContract.response.safeParse(
    (await response.json())?.data,
  );
  const grants = listAccessGrantQueueContract.response.safeParse(
    (await grantsResponse.json())?.data,
  );
  if (!parsed.success || !grants.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Access Request management</h1>
      <h2>Access Grants</h2>
      {grants.data.length ? (
        <ul>
          {grants.data.map((grant) => (
            <li key={grant.id}>
              <Link href={`/papers/${encodeURIComponent(grant.publicId)}`}>
                {grant.paperTitle}
              </Link>
              {` — ${grant.accountName}, expires ${new Date(grant.expiresAt).toLocaleString()}`}
              {grant.revokedAt ? (
                <p>Revoked: {grant.revocationReason}</p>
              ) : (
                <GrantRevoke grantId={grant.id} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No Access Grants.</p>
      )}
      {parsed.data.length ? (
        <ul>
          {parsed.data.map((request) => (
            <li key={request.id}>
              <h2>
                <Link href={`/papers/${encodeURIComponent(request.publicId)}`}>
                  {request.paperTitle}
                </Link>
              </h2>
              <p>
                {request.requesterName} ({request.requesterRole})
                {request.program ? ` — ${request.program}` : ""}
              </p>
              <p>{request.purpose}</p>
              <p>
                Request expires {new Date(request.expiresAt).toLocaleString()}
              </p>
              {request.earlierDecisions.length > 0 && (
                <details>
                  <summary>Earlier decisions on this Paper</summary>
                  <ul>
                    {request.earlierDecisions.map((decision) => (
                      <li key={decision.decidedAt}>
                        {decision.decision} —{" "}
                        {new Date(decision.decidedAt).toLocaleString()}
                        {decision.reason && `: ${decision.reason}`}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <AccessDecision
                requestId={request.id}
                defaultDays={request.defaultGrantDays}
                maximumDays={request.maximumGrantDays}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p>No pending Access Requests.</p>
      )}
    </main>
  );
}
