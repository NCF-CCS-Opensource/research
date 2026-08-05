import { SearchForm } from "@/components/forms/search-form"
import { Pagination } from "@/components/features/pagination"
import { ResearchCard } from "@/components/features/research-card"
import { PublicShell } from "@/components/layout/public-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { discovery } from "@/lib/web-transport"
import type { Category, Keyword } from "@repo/api-client"
import type { ResearchSummary } from "@/types/api"

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
    return await discovery.searchResearch(params)
  } catch {
    return {
      data: [] as ResearchSummary[],
      meta: { total: 0, page: Number(params.page ?? 1), totalPages: 0 },
    }
  }
}

async function loadCategories() {
  try {
    return await discovery.getCategories()
  } catch {
    return [] as Category[]
  }
}

async function loadKeywords() {
  try {
    return await discovery.getKeywords()
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
      <div className="archive-grid border-b border-foreground/15">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <SearchForm compact defaultValue={params.q ?? ""} />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <Card className="h-fit gap-0 py-0">
          <div className="border-b px-5 py-4">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              Refine index
            </p>
            <h2 className="mt-1 font-heading text-2xl">Filters</h2>
          </div>
          <form className="grid gap-4 p-5">
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
              <Input
                name="dateFrom"
                type="date"
                defaultValue={params.dateFrom ?? ""}
                className="h-10"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Date to
              <Input
                name="dateTo"
                type="date"
                defaultValue={params.dateTo ?? ""}
                className="h-10"
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
        </Card>

        <section>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="secondary" className="rounded-sm font-mono">
                {results.meta.total} records
              </Badge>
              <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight">
                Search results
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
            <Card className="border-dashed p-10 text-center text-muted-foreground">
              No matching research found.
            </Card>
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
