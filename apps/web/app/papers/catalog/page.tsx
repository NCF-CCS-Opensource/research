import { listPublishedPapersContract } from "@repo/contracts";
import Link from "next/link";
import { apiFetch, apiMessage } from "../../../lib/backend";

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function CatalogPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Search> }>) {
  const params = await searchParams;
  const values = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, first(value)]),
  );
  const parsedQuery = listPublishedPapersContract.query.safeParse(values);
  if (!parsedQuery.success)
    return (
      <main>
        <h1>Paper catalog</h1>
        <p role="alert">
          Some search filters are invalid. Update them and try again.
        </p>
      </main>
    );
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value) query.set(key, value);
  const response = await apiFetch(
    `${listPublishedPapersContract.path}?${query}`,
  );
  if (!response.ok)
    return (
      <main>
        <h1>Paper catalog</h1>
        <p role="alert">{await apiMessage(response)}</p>
      </main>
    );
  const result = listPublishedPapersContract.response.safeParse(
    (await response.json())?.data,
  );
  if (!result.success)
    return (
      <main>
        <h1>Paper catalog</h1>
        <p role="alert">The catalog could not be loaded.</p>
      </main>
    );
  const { data } = result;
  const pageUrl = (page: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    return `/papers/catalog?${next}`;
  };
  return (
    <main style={{ padding: "2rem", display: "grid", gap: "1rem" }}>
      <h1>Paper catalog</h1>
      <form
        action="/papers/catalog"
        method="get"
        style={{ display: "grid", gap: ".75rem", maxWidth: "36rem" }}
      >
        <label>
          Search <input name="q" defaultValue={values.q} />
        </label>
        <label>
          Program{" "}
          <select name="program" defaultValue={values.program ?? ""}>
            <option value="">All programs</option>
            {data.programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Year{" "}
          <select name="year" defaultValue={values.year ?? ""}>
            <option value="">All years</option>
            {data.years.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        <label>
          Research Type{" "}
          <select name="researchType" defaultValue={values.researchType ?? ""}>
            <option value="">All types</option>
            {["THESIS", "CAPSTONE", "RESEARCH_PAPER", "PROJECT_REPORT"].map(
              (type) => (
                <option key={type}>{type}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Sort{" "}
          <select
            name="sort"
            defaultValue={values.sort ?? (values.q ? "relevance" : "date")}
          >
            <option value="relevance">Relevance</option>
            <option value="date">Publication date</option>
            <option value="title">Title</option>
          </select>
        </label>
        <button type="submit">Search</button>
      </form>
      {data.items.length ? (
        <ul>
          {data.items.map((paper) => (
            <li key={paper.publicId}>
              <Link href={`/papers/${paper.publicId}`}>{paper.title}</Link> —{" "}
              {paper.year} · {paper.program}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {values.q || values.program || values.year || values.researchType
            ? "No Papers match these filters."
            : "No Papers have been published yet."}
        </p>
      )}
      <p>{data.total} results</p>
      <nav aria-label="Catalog pages">
        {data.page > 1 && (
          <Link rel="prev" href={pageUrl(data.page - 1)}>
            Previous
          </Link>
        )}{" "}
        {data.page * data.pageSize < data.total && (
          <Link rel="next" href={pageUrl(data.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </main>
  );
}
