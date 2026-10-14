import { listAuditEventsContract } from "@repo/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "../../../lib/backend";

export const dynamic = "force-dynamic";

const FILTERS = ["actorId", "action", "subjectId", "from", "to"] as const;

export default async function AuditPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | undefined>> }>) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of FILTERS) if (params[key]) query.set(key, params[key]);
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  query.set("page", String(page));

  // The date inputs omit the offset the API requires.
  const apiQuery = new URLSearchParams(query);
  for (const key of ["from", "to"] as const) {
    const date = new Date(query.get(key) ?? "");
    if (!Number.isNaN(date.getTime())) apiQuery.set(key, date.toISOString());
  }
  const res = await apiFetch(`${listAuditEventsContract.path}?${apiQuery}`);
  if (res.status === 401 || res.status === 403) notFound();
  const parsed = listAuditEventsContract.response.safeParse(
    await res.json().catch(() => null),
  );
  const result = res.ok && parsed.success ? parsed.data.data : null;

  const pageLink = (to: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(to));
    return `/admin/audit?${next}`;
  };

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Audit log</h1>
      <p>
        <Link href="/admin/accounts">Accounts</Link>
      </p>
      <form style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          name="actorId"
          placeholder="Actor ID"
          defaultValue={params.actorId}
        />
        <input
          name="action"
          placeholder="Action"
          defaultValue={params.action}
        />
        <input
          name="subjectId"
          placeholder="Item ID"
          defaultValue={params.subjectId}
        />
        <label>
          From{" "}
          <input
            name="from"
            type="datetime-local"
            defaultValue={params.from?.slice(0, 16)}
          />
        </label>
        <label>
          To{" "}
          <input
            name="to"
            type="datetime-local"
            defaultValue={params.to?.slice(0, 16)}
          />
        </label>
        <button type="submit">Filter</button>
      </form>
      {result ? (
        <>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Item</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.occurredAt).toLocaleString()}</td>
                  <td>{event.actorName ?? "System"}</td>
                  <td>{event.action}</td>
                  <td>
                    {event.subjectType} {event.subjectId}
                  </td>
                  <td>
                    <code>{JSON.stringify(event.details)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            {page > 1 && <Link href={pageLink(page - 1)}>Previous</Link>} Page{" "}
            {page}{" "}
            {result.hasMore && <Link href={pageLink(page + 1)}>Next</Link>}
          </p>
        </>
      ) : (
        <p role="alert">Check the filters and try again.</p>
      )}
    </main>
  );
}
