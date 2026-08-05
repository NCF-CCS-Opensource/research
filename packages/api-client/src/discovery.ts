import type { TransportAdapter } from "./transport"
import type {
  Author,
  Category,
  Keyword,
  ResearchDetail,
  ResearchRow,
} from "./types"
import { mapResearch } from "./types"
import { DomainApiError } from "./errors"

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number
    page: number
    totalPages: number
  }
}

export type SearchSuggestions = {
  researches: Array<{ id: string; title: string; similarity: number }>
  authors: Array<{ id: string; name: string }>
}

export type ResearchSearchParams = {
  q?: string
  category?: string
  keyword?: string
  author?: string
  dateFrom?: string
  dateTo?: string
  sort?: string
  page?: string | number
  limit?: string | number
}

export type AuthorSearchParams = {
  search?: string
  page?: string | number
  limit?: string | number
}

export type Discovery = {
  getRecentResearch(
    limit?: number
  ): Promise<PaginatedResponse<ResearchDetail>>
  searchResearch(
    query: ResearchSearchParams
  ): Promise<PaginatedResponse<ResearchDetail>>
  getResearch(id: string): Promise<ResearchDetail>
  getCategories(): Promise<Category[]>
  getCategory(
    id: string,
    page?: number
  ): Promise<{
    data: Category & { researches: ResearchDetail[] }
    meta: PaginatedResponse<unknown>["meta"]
  }>
  getKeywords(): Promise<Keyword[]>
  getAuthors(
    query: AuthorSearchParams
  ): Promise<PaginatedResponse<Author>>
  getAuthor(id: string): Promise<Author>
  getAuthorPapers(
    id: string,
    page?: number
  ): Promise<PaginatedResponse<ResearchDetail>>
  getSuggestions(q: string): Promise<SearchSuggestions>
  recordEngagement(
    researchId: string,
    kind: "view" | "citation_export"
  ): Promise<void>
}

function paginated<T>(
  data: T[],
  count: number | null,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const total = count ?? 0
  return { data, meta: { total, page, totalPages: Math.ceil(total / limit) } }
}

function positiveNumber(value: string | number | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function optionalString(value: string | number | undefined) {
  const result = value === undefined ? "" : String(value).trim()
  return result || undefined
}

function mapAuthor(row: Record<string, unknown>): Author {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string | null,
    paperCount: row.paper_count as number,
  }
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    researchCount: row.research_count as number,
  }
}

export function createDiscovery(adapter: TransportAdapter): Discovery {
  async function searchResearch(
    query: ResearchSearchParams
  ): Promise<PaginatedResponse<ResearchDetail>> {
    const page = positiveNumber(query.page, 1)
    const limit = positiveNumber(query.limit, 10)
    const params = {
      p_query: optionalString(query.q),
      p_category: optionalString(query.category),
      p_keyword: optionalString(query.keyword),
      p_author: optionalString(query.author),
      p_date_from: optionalString(query.dateFrom),
      p_date_to: optionalString(query.dateTo),
      p_sort: optionalString(query.sort) ?? "relevance",
      p_limit: limit,
      p_offset: (page - 1) * limit,
    }
    const rows = await adapter.rpc<ResearchRow[]>(
      "search_public_research",
      params
    )
    const data = rows ?? []
    let total = Number((data[0] as Record<string, unknown>)?.total_count ?? 0)
    if (!data.length && page > 1) {
      const probe = await adapter.rpc<ResearchRow[]>(
        "search_public_research",
        { ...params, p_limit: 1, p_offset: 0 }
      )
      total = Number(
        ((probe ?? [])[0] as Record<string, unknown>)?.total_count ?? 0
      )
    }
    return paginated(data.map(mapResearch), total, page, limit)
  }

  async function getAuthors(
    query: AuthorSearchParams
  ): Promise<PaginatedResponse<Author>> {
    const page = positiveNumber(query.page, 1)
    const limit = positiveNumber(query.limit, 20)
    const search = optionalString(query.search)
    const rows = await adapter.select<Record<string, unknown>>(
      "public_authors",
      {
        ...(search
          ? { ilike: { column: "name", pattern: `%${search}%` } }
          : {}),
        order: { column: "name" },
      }
    )
    const paged = rows.slice((page - 1) * limit, page * limit)
    return paginated(paged.map(mapAuthor), rows.length, page, limit)
  }

  return {
    async getRecentResearch(limit = 6) {
      const rows = await adapter.select<ResearchRow>("public_research", {
        order: { column: "created_at", ascending: false },
        range: { from: 0, to: limit - 1 },
      })
      return paginated(rows.map(mapResearch), rows.length, 1, limit)
    },

    searchResearch,

    async getResearch(id) {
      return adapter
        .selectOne<ResearchRow>("public_research", { eq: { id } })
        .then(mapResearch) as Promise<ResearchDetail>
    },

    async getCategories() {
      const rows = await adapter.select<Record<string, unknown>>(
        "public_categories",
        { order: { column: "name" } }
      )
      return rows.map(mapCategory)
    },

    async getCategory(id, page = 1) {
      const limit = 10
      const [category, allPapers] = await Promise.all([
        adapter.selectOne<Record<string, unknown>>("public_categories", {
          eq: { id },
        }),
        adapter.select<ResearchRow>("public_research", {
          contains: { column: "categories", value: [{ id }] },
          order: { column: "created_at", ascending: false },
        }),
      ])
      const paged = allPapers.slice((page - 1) * limit, page * limit)
      return {
        data: {
          ...mapCategory(category),
          researches: paged.map(mapResearch),
        },
        meta: paginated(paged.map(mapResearch), allPapers.length, page, limit)
          .meta,
      }
    },

    async getKeywords() {
      return adapter.select<Keyword>("keywords", {
        columns: "id,name",
        order: { column: "name" },
      })
    },

    getAuthors,

    async getAuthor(id) {
      const row = await adapter.selectOne<Record<string, unknown>>(
        "public_authors",
        { eq: { id } }
      )
      return mapAuthor(row)
    },

    async getAuthorPapers(id, page = 1) {
      const limit = 10
      const allRows = await adapter.select<ResearchRow>("public_research", {
        contains: { column: "authors", value: [{ id }] },
        order: { column: "created_at", ascending: false },
      })
      const paged = allRows.slice((page - 1) * limit, page * limit)
      return paginated(paged.map(mapResearch), allRows.length, page, limit)
    },

    async getSuggestions(q) {
      const [researches, authors] = await Promise.all([
        searchResearch({ q, page: 1, limit: 4 }),
        getAuthors({ search: q, page: 1, limit: 3 }),
      ])
      return {
        researches: researches.data.map(({ id, title, rank = 0 }) => ({
          id,
          title,
          similarity: rank,
        })),
        authors: authors.data.map(({ id, name }) => ({ id, name })),
      } satisfies SearchSuggestions
    },

    async recordEngagement(researchId, kind) {
      await adapter.rpc("record_engagement", {
        target_research_id: researchId,
        kind,
      })
    },
  }
}
