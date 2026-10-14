import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch, getCurrentIdentity } from "../lib/backend";
import {
  getDashboardContract,
  listPublishedPapersContract,
} from "@repo/contracts";

// Rendered per request so builds do not need the API running.
export const dynamic = "force-dynamic";

// Routing here is a convenience; the API decides what each identity may do.
export default async function Home() {
  const identity = await getCurrentIdentity();
  if (identity.state === "registering") redirect("/register");
  if (identity.state === "deactivated") redirect("/deactivated");
  const catalogResponse = await apiFetch(listPublishedPapersContract.path);
  const catalog = catalogResponse.ok
    ? listPublishedPapersContract.response.safeParse(
        (await catalogResponse.json())?.data,
      )
    : null;
  const dashboardResponse =
    identity.state === "active"
      ? await apiFetch(getDashboardContract.path)
      : null;
  const dashboard = dashboardResponse?.ok
    ? getDashboardContract.response.safeParse(
        (await dashboardResponse.json())?.data,
      )
    : null;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>CCS Research Repository</h1>
      {identity.state === "guest" ? (
        <Link href="/sign-in">Sign in</Link>
      ) : (
        <>
          <p>
            Signed in as {identity.account.name} (
            {identity.account.role.toLowerCase()}).
          </p>
          {dashboard?.success && (
            <section aria-labelledby="dashboard-heading">
              <h2 id="dashboard-heading">Your dashboard</h2>
              {dashboard.data.role === "STUDENT" && (
                <>
                  <h3>Your Papers</h3>
                  <ul>
                    {dashboard.data.papers.map((paper) => (
                      <li key={paper.publicId}>
                        <Link href={`/papers/${paper.publicId}`}>
                          {paper.title}
                        </Link>{" "}
                        — {paper.status} · {paper.publicationStatus}
                      </li>
                    ))}
                  </ul>
                  <h3>Your Books</h3>
                  <ul>
                    {dashboard.data.books.map((book) => (
                      <li key={book.publicId}>
                        {book.title} — {book.status}
                      </li>
                    ))}
                  </ul>
                  <h3>Access Requests</h3>
                  <ul>
                    {dashboard.data.requests.map((request) => (
                      <li key={request.id}>
                        <Link href={`/papers/${request.publicId}`}>
                          {request.paperTitle}
                        </Link>{" "}
                        — {request.status}
                      </li>
                    ))}
                  </ul>
                  <h3>Active Access Grants</h3>
                  <ul>
                    {dashboard.data.grants.map((grant) => (
                      <li key={grant.id}>
                        <Link href={`/papers/${grant.publicId}`}>
                          {grant.paperTitle}
                        </Link>{" "}
                        — expires{" "}
                        {new Date(grant.expiresAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {dashboard.data.role === "INSTRUCTOR" && (
                <>
                  <h3>Papers awaiting your Endorsement</h3>
                  <ul>
                    {dashboard.data.papers.map((paper) => (
                      <li key={paper.publicId}>
                        <Link href={`/papers/${paper.publicId}`}>
                          {paper.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <h3>Access Requests for your Papers</h3>
                  <ul>
                    {dashboard.data.requests.map((request) => (
                      <li key={request.id}>
                        <Link href={`/papers/${request.publicId}`}>
                          {request.paperTitle}
                        </Link>{" "}
                        — {request.requesterName}, {request.status},{" "}
                        {new Date(request.createdAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                  <h3>Active Access Grants on your Papers</h3>
                  <ul>
                    {dashboard.data.grants.map((grant) => (
                      <li key={grant.id}>
                        <Link href={`/papers/${grant.publicId}`}>
                          {grant.paperTitle}
                        </Link>{" "}
                        — {grant.accountName}, expires{" "}
                        {new Date(grant.expiresAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {dashboard.data.role === "COORDINATOR" && (
                <>
                  <h3>Endorsed Papers awaiting Publication</h3>
                  <ul>
                    {dashboard.data.papers.map((paper) => (
                      <li key={paper.publicId}>
                        <Link href={`/papers/${paper.publicId}`}>
                          {paper.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <h3>Submitted Books</h3>
                  <ul>
                    {dashboard.data.books.map((book) => (
                      <li key={book.publicId}>{book.title}</li>
                    ))}
                  </ul>
                  <h3>Pending Access Requests</h3>
                  <ul>
                    {dashboard.data.requests.map((request) => (
                      <li key={request.id}>
                        <Link href={`/papers/${request.publicId}`}>
                          {request.paperTitle}
                        </Link>{" "}
                        — pending for {request.ageDays}{" "}
                        {request.ageDays === 1 ? "day" : "days"}
                      </li>
                    ))}
                  </ul>
                  <h3>Failed Emails</h3>
                  <p>
                    <Link href="/admin/emails">Manage failed emails</Link>
                  </p>
                  <ul>
                    {dashboard.data.failedEmails.map((email) => (
                      <li key={email.id}>
                        {email.event} to {email.recipientName} —{" "}
                        {email.paperTitle}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p>
                These figures show platform activity. An approved Access Grant
                does not prove that a Paper was read.
              </p>
            </section>
          )}
          {identity.account.role === "COORDINATOR" && (
            <>
              <p>
                <Link href="/admin/accounts">Manage accounts</Link>
              </p>
              <p>
                <Link href="/papers/publication-queue">Publication queue</Link>
              </p>
              <p>
                <Link href="/books/publication-queue">
                  Book publication queue
                </Link>
              </p>
              <p>
                <Link href="/books/create">Upload a Book</Link>
              </p>
              <p>
                <Link href="/papers/legacy-deposit">Create Legacy Deposit</Link>
              </p>
              <p>
                <Link href="/papers/access-management">Access Requests</Link>
              </p>
            </>
          )}
          {identity.account.role === "STUDENT" && (
            <>
              <p>
                <Link href="/papers">My Papers</Link>
              </p>
              <p>
                <Link href="/papers/access-requests">My Access Requests</Link>
                <br />
                <Link href="/books/mine">My Books</Link> ·{" "}
                <Link href="/books/create">Upload a Book</Link>
              </p>
            </>
          )}
          {identity.account.role === "INSTRUCTOR" && (
            <p>
              <Link href="/papers/access-management">Access Requests</Link>
              <br />
              <Link href="/books/mine">My Books</Link> ·{" "}
              <Link href="/books/create">Upload a Book</Link>
            </p>
          )}
        </>
      )}
      <h2>Recently published Papers</h2>
      <p>
        <Link href="/books">Browse Books</Link>
      </p>
      <p>
        <Link href="/papers/catalog">Search the catalog</Link>
      </p>
      {catalog?.success && catalog.data.items.length ? (
        <ul>
          {catalog.data.items.map((paper) => (
            <li key={paper.publicId}>
              <Link href={`/papers/${paper.publicId}`}>{paper.title}</Link> —{" "}
              {paper.year} · {paper.program}
            </li>
          ))}
        </ul>
      ) : (
        <p>No Papers have been published yet.</p>
      )}
    </main>
  );
}
