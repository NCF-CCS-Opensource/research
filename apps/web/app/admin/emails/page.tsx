import { listFailedEmailJobsContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";
import { retryEmailJob } from "./actions";

export const dynamic = "force-dynamic";

export default async function FailedEmailsPage() {
  const res = await apiFetch(listFailedEmailJobsContract.path);
  if (res.status === 401 || res.status === 403) notFound();
  if (!res.ok) throw new Error(`Email list failed: ${res.status}`);
  const jobs = listFailedEmailJobsContract.response.parse(
    await res.json(),
  ).data;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Failed emails</h1>
      <p>
        <Link href="/admin/accounts">Accounts</Link>
      </p>
      {jobs.length ? (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Recipient</th>
              <th>Paper</th>
              <th>Attempts</th>
              <th>Error</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{new Date(job.createdAt).toLocaleString()}</td>
                <td>{job.event}</td>
                <td>
                  {job.recipientName} ({job.recipientEmail})
                </td>
                <td>
                  <Link
                    href={`/papers/${encodeURIComponent(job.paperPublicId)}`}
                  >
                    {job.paperTitle}
                  </Link>
                </td>
                <td>{job.attempts}</td>
                <td>{job.lastError ?? "Unknown error"}</td>
                <td>
                  <form action={retryEmailJob}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <button type="submit">Retry</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No failed emails.</p>
      )}
    </main>
  );
}
