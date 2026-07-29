import { SearchForm } from "@/components/forms/search-form"
import { Pagination } from "@/components/features/pagination"
import { ResearchCard } from "@/components/features/research-card"
import { PublicShell } from "@/components/layout/public-shell"
import { Button } from "@/components/ui/button"
import { getCategories, getKeywords, searchResearch } from "@/lib/api"
import type { Category, Keyword, ResearchSummary } from "@/types/api"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input
}

function hrefWith(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params)
  next.set("page", String(page))
  return `/search?${next.toString()}`
}

async function loadSearch(params: Record<string, string | number | undefined>) {
  try {
    return await searchResearch(params)
  } catch {
    return {
      data: [] as ResearchSummary[],
      meta: { total: 0, page: Number(params.page ?? 1), totalPages: 0 },
    }
  }
}

async function loadCategories() {
  try {
    return await getCategories()
  } catch {
    return [] as Category[]
  }
}

async function loadKeywords() {
  try {
    return await getKeywords()
  } catch {
    return [] as Keyword[]
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = await searchParams
  const page = Number(value(raw.page) ?? 1)
  const params = {
    q: value(raw.q),
    category: value(raw.category),
    keyword: value(raw.keyword),
    author: value(raw.author),
    dateFrom: value(raw.dateFrom),
    dateTo: value(raw.dateTo),
    sort: value(raw.sort) ?? "relevance",
    page,
    limit: 10,
  }
  const queryString = new URLSearchParams()
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== "") queryString.set(key, String(val))
  })

  const [results, categories, keywords] = await Promise.all([
    loadSearch(params),
    loadCategories(),
    loadKeywords(),
  ])

  return (
    <PublicShell>
      <div className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <SearchForm compact defaultValue={params.q ?? ""} />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="h-fit rounded-3xl border bg-card p-5">
          <h2 className="font-semibold">Filters</h2>
          <form className="mt-5 grid gap-4">
            <input type="hidden" name="q" value={params.q ?? ""} />
            <label className="grid gap-2 text-sm">
              Category
              <select
                name="category"
                defaultValue={params.category ?? ""}
                className="h-10 rounded-lg border bg-background px-3"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Keyword
              <select
                name="keyword"
                defaultValue={params.keyword ?? ""}
                className="h-10 rounded-lg border bg-background px-3"
              >
                <option value="">All keywords</option>
                {keywords.map((kw) => (
                  <option key={kw.id} value={kw.id}>
                    {kw.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              Date from
              <input
                name="dateFrom"
                type="date"
                defaultValue={params.dateFrom ?? ""}
                className="h-10 rounded-lg border bg-background px-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Date to
              <input
                name="dateTo"
                type="date"
                defaultValue={params.dateTo ?? ""}
                className="h-10 rounded-lg border bg-background px-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Sort
              <select
                name="sort"
                defaultValue={params.sort}
                className="h-10 rounded-lg border bg-background px-3"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="views">Views</option>
                <option value="downloads">Downloads</option>
              </select>
            </label>
            <Button type="submit">Apply</Button>
            <Button type="button" variant="outline" asChild>
              <a href="/search">Clear</a>
            </Button>
          </form>
        </aside>

        <section>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {results.meta.total} results
                {params.q ? ` for "${params.q}"` : ""}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Search by title, abstract, author, keyword, category, or date
                range.
              </p>
            </div>
          </div>

          {results.data.length ? (
            <div className="grid gap-4">
              {results.data.map((research) => (
                <ResearchCard key={research.id} research={research} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
              No matching research found.
            </div>
          )}

          <Pagination
            page={results.meta.page}
            totalPages={results.meta.totalPages}
            getHref={(target) => hrefWith(queryString, target)}
          />
        </section>
      </div>
    </PublicShell>
  )
}
