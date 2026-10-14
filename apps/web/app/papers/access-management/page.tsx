import { listAccessRequestQueueContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { AccessDecision } from "./access-decision";

export const dynamic = "force-dynamic";
export default async function AccessManagementPage() {
  const response = await apiFetch(listAccessRequestQueueContract.path);
  if (!response.ok) notFound();
  const parsed = listAccessRequestQueueContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!parsed.success) notFound();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Access Request management</h1>
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
