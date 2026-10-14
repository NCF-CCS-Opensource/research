import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch, getCurrentIdentity } from "../lib/backend";
import { listPublishedPapersContract } from "@repo/contracts";

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
          {identity.account.role === "COORDINATOR" && (
            <>
              <p>
                <Link href="/admin/accounts">Manage accounts</Link>
              </p>
              <p>
                <Link href="/papers/publication-queue">Publication queue</Link>
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
              </p>
            </>
          )}
          {identity.account.role === "INSTRUCTOR" && (
            <p>
              <Link href="/papers/access-management">Access Requests</Link>
            </p>
          )}
        </>
      )}
      <h2>Recently published Papers</h2>
      <p><Link href="/books">Browse Books</Link></p>
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
