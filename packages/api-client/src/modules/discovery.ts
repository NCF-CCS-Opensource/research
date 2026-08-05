import type { Author, Category, Keyword, PaginatedResponse, ResearchDetail, ResearchSummary, SearchSuggestions } from "../types"
import type { TransportAdapter } from "../transport"
import { DomainApiError, NotFoundError, TransportError } from "../errors"
import { mapResearch, mapAuthor, mapCategory, paginated, positiveNumber, optionalString, type PublicResearchRow } from "../mappers"

function throwIfError(error: { message: string; code?: string } | null, fallbackStatus = 500): asserts error is null {
  if (!error) return
  const status = error.code === "PGRST116" ? 404 : fallbackStatus
  throw new DomainApiError(error.message, status, error.code)
}

export type DiscoveryModule = {
  search(query: Record<string, string | number | undefined>): Promise<PaginatedResponse<ResearchSummary>>
  getRecent(limit?: number): Promise<PaginatedResponse<ResearchSummary>>
  getDetail(id: string): Promise<ResearchDetail>
  getCategories(): Promise<Category[]>
  getCategory(id: string, page?: number): Promise<{ data: Category & { researches: ResearchSummary[] }; meta: PaginatedResponse<unknown>["meta"] }>
  getKeywords(): Promise<Keyword[]>
  getAuthors(query: Record<string, string | number | undefined>): Promise<PaginatedResponse<Author>>
  getAuthor(id: string): Promise<Author>
  getAuthorPapers(id: string, page?: number): Promise<PaginatedResponse<ResearchSummary>>
  getSuggestions(q: string): Promise<SearchSuggestions>
  recordEngagement(researchId: string, kind: "view" | "citation_export"): Promise<void>
}

export function createDiscoveryModule(transport: TransportAdapter): DiscoveryModule {
  const module: DiscoveryModule = {
    async search(query) {
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

      const { data, error } = await transport.rpc<PublicResearchRow[]>({
        fn: "search_public_research",
        params,
      })
      throwIfError(error)

      const rows = (Array.isArray(data) ? data : []) as PublicResearchRow[]
      let total = Number(rows[0]?.total_count ?? 0)

      if (!rows.length && page > 1) {
        const probe = await transport.rpc<PublicResearchRow[]>({
          fn: "search_public_research",
          params: { ...params, p_limit: 1, p_offset: 0 },
        })
        if (probe.error) throw new TransportError(probe.error.message)
        const probeRows = (Array.isArray(probe.data) ? probe.data : []) as PublicResearchRow[]
        total = Number(probeRows[0]?.total_count ?? 0)
      }

      return paginated(rows.map(mapResearch), total, page, limit)
    },

    async getRecent(limit = 6) {
      const { data, error, count } = await transport.select<PublicResearchRow[]>({
        table: "public_research",
        columns: "*",
        order: { column: "created_at", ascending: false },
        range: { from: 0, to: limit - 1 },
        count: true,
      })
      throwIfError(error)
      const rows = (Array.isArray(data) ? data : []) as PublicResearchRow[]
      return paginated(rows.map(mapResearch), count, 1, limit)
    },

    async getDetail(id) {
      const { data, error } = await transport.select<PublicResearchRow>({
        table: "public_research",
        columns: "*",
        filters: [{ column: "id", op: "eq", value: id }],
        single: true,
      })
      throwIfError(error)
      if (!data) throw new NotFoundError()
      return mapResearch(data as unknown as PublicResearchRow)
    },

    async getCategories() {
      const { data, error } = await transport.select<Record<string, unknown>[]>({
        table: "public_categories",
        columns: "*",
        order: { column: "name", ascending: true },
      })
      throwIfError(error)
      const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
      return rows.map(mapCategory)
    },

    async getCategory(id, page = 1) {
      const limit = 10
      const [categoryResult, papersResult] = await Promise.all([
        transport.select<Record<string, unknown>>({
          table: "public_categories",
          columns: "*",
          filters: [{ column: "id", op: "eq", value: id }],
          single: true,
        }),
        transport.select<PublicResearchRow[]>({
          table: "public_research",
          columns: "*",
          filters: [{ column: "categories", op: "contains", value: JSON.stringify([{ id }]) }],
          order: { column: "created_at", ascending: false },
          range: { from: (page - 1) * limit, to: page * limit - 1 },
          count: true,
        }),
      ])
      throwIfError(categoryResult.error)
      if (!categoryResult.data) throw new NotFoundError()
      throwIfError(papersResult.error)

      const papers = (Array.isArray(papersResult.data) ? papersResult.data : []) as PublicResearchRow[]
      return {
        data: {
          ...mapCategory(categoryResult.data as Record<string, unknown>),
          researches: papers.map(mapResearch),
        },
        meta: paginated([], papersResult.count, page, limit).meta,
      }
    },

    async getKeywords() {
      const { data, error } = await transport.select<Keyword[]>({
        table: "keywords",
        columns: "id,name",
        order: { column: "name", ascending: true },
      })
      throwIfError(error)
      return (Array.isArray(data) ? data : []) as Keyword[]
    },

    async getAuthors(query) {
      const page = positiveNumber(query.page, 1)
      const limit = positiveNumber(query.limit, 20)

      const filters = optionalString(query.search)
        ? [{ column: "name", op: "ilike" as const, value: `%${optionalString(query.search)}%` }]
        : undefined

      const { data, error, count } = await transport.select<Record<string, unknown>[]>({
        table: "public_authors",
        columns: "*",
        filters,
        order: { column: "name", ascending: true },
        range: { from: (page - 1) * limit, to: page * limit - 1 },
        count: true,
      })
      throwIfError(error)
      const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
      return paginated(rows.map(mapAuthor), count, page, limit)
    },

    async getAuthor(id) {
      const { data, error } = await transport.select<Record<string, unknown>>({
        table: "public_authors",
        columns: "*",
        filters: [{ column: "id", op: "eq", value: id }],
        single: true,
      })
      throwIfError(error)
      if (!data) throw new NotFoundError()
      return mapAuthor(data as Record<string, unknown>)
    },

    async getAuthorPapers(id, page = 1) {
      const limit = 10
      const { data, error, count } = await transport.select<PublicResearchRow[]>({
        table: "public_research",
        columns: "*",
        filters: [{ column: "authors", op: "contains", value: JSON.stringify([{ id }]) }],
        order: { column: "created_at", ascending: false },
        range: { from: (page - 1) * limit, to: page * limit - 1 },
        count: true,
      })
      throwIfError(error)
      const rows = (Array.isArray(data) ? data : []) as PublicResearchRow[]
      return paginated(rows.map(mapResearch), count, page, limit)
    },

    async getSuggestions(q) {
      const [researches, authors] = await Promise.all([
        module.search({ q, page: 1, limit: 4 }),
        module.getAuthors({ search: q, page: 1, limit: 3 }),
      ])
      return {
        researches: researches.data.map(({ id, title, rank = 0 }) => ({
          id,
          title,
          similarity: rank,
        })),
        authors: authors.data.map(({ id, name }) => ({ id, name })),
      }
    },

    async recordEngagement(researchId, kind) {
      const { error } = await transport.rpc<void>({
        fn: "record_engagement",
        params: { target_research_id: researchId, kind },
      })
      throwIfError(error, 400)
    },
  }

  return module
}
