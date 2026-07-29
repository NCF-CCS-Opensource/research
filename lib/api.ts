import type {
  ApiEnvelope,
  Author,
  Category,
  Keyword,
  PaginatedResponse,
  ResearchDetail,
  ResearchSummary,
  SearchSuggestions,
} from "@/types/api"
import { getSupabase } from "@/lib/supabase"

export const API_ROOT = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api`

type RequestOptions = RequestInit & {
  token?: string
  query?: Record<string, string | number | undefined | null>
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(`${API_ROOT}${path}`)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function parseError(response: Response) {
  try {
    const payload = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(payload.message)) {
      return payload.message.join(" ")
    }
    return payload.message ?? response.statusText
  } catch {
    return response.statusText
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
) {
  const { token, query, headers, ...init } = options
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  return (await response.json()) as T
}

export async function getEnvelope<T>(path: string, options?: RequestOptions) {
  const response = await apiRequest<ApiEnvelope<T>>(path, options)
  return response.data
}

export async function getPaginated<T>(path: string, options?: RequestOptions) {
  return apiRequest<PaginatedResponse<T>>(path, options)
}

export async function getRecentResearch(limit = 6) {
  const { data, error, count } = await getSupabase()
    .from("public_research")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(0, limit - 1)
  if (error) throw new ApiError(error.message, 500)
  return paginated(data.map(mapResearch), count, 1, limit)
}

export async function searchResearch(
  query: Record<string, string | number | undefined>
) {
  const page = positiveNumber(query.page, 1)
  const limit = positiveNumber(query.limit, 10)
  const supabase = getSupabase()
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
  const { data, error } = await supabase.rpc("search_public_research", params)
  if (error) throw new ApiError(error.message, 500)
  const rows = (data ?? []) as PublicResearchRow[]
  let total = Number(rows[0]?.total_count ?? 0)
  if (!rows.length && page > 1) {
    const probe = await supabase.rpc("search_public_research", {
      ...params,
      p_limit: 1,
      p_offset: 0,
    })
    if (probe.error) throw new ApiError(probe.error.message, 500)
    total = Number(probe.data?.[0]?.total_count ?? 0)
  }
  return paginated(
    rows.map(mapResearch),
    total,
    page,
    limit
  )
}

export async function getResearch(id: string) {
  const { data, error } = await getSupabase()
    .from("public_research")
    .select("*")
    .eq("id", id)
    .single()
  if (error)
    throw new ApiError(error.message, error.code === "PGRST116" ? 404 : 500)
  return mapResearch(data) as ResearchDetail
}

export async function getCategories() {
  const { data, error } = await getSupabase()
    .from("public_categories")
    .select("*")
    .order("name")
  if (error) throw new ApiError(error.message, 500)
  return data.map(mapCategory)
}

export async function getCategory(id: string, page = 1) {
  const limit = 10
  const supabase = getSupabase()
  const [{ data: category, error: categoryError }, papers] = await Promise.all([
    supabase.from("public_categories").select("*").eq("id", id).single(),
    supabase
      .from("public_research")
      .select("*", { count: "exact" })
      .contains("categories", JSON.stringify([{ id }]))
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1),
  ])
  if (categoryError)
    throw new ApiError(
      categoryError.message,
      categoryError.code === "PGRST116" ? 404 : 500
    )
  if (papers.error) throw new ApiError(papers.error.message, 500)
  return {
    data: {
      ...mapCategory(category),
      researches: papers.data.map(mapResearch),
    },
    meta: paginated([], papers.count, page, limit).meta,
  }
}

export async function getKeywords() {
  const { data, error } = await getSupabase()
    .from("keywords")
    .select("id,name")
    .order("name")
  if (error) throw new ApiError(error.message, 500)
  return data as Keyword[]
}

export async function getAuthors(
  query: Record<string, string | number | undefined>
) {
  const page = positiveNumber(query.page, 1)
  const limit = positiveNumber(query.limit, 20)
  let request = getSupabase()
    .from("public_authors")
    .select("*", { count: "exact" })
    .order("name")
    .range((page - 1) * limit, page * limit - 1)
  if (optionalString(query.search))
    request = request.ilike("name", `%${optionalString(query.search)}%`)
  const { data, error, count } = await request
  if (error) throw new ApiError(error.message, 500)
  return paginated(data.map(mapAuthor), count, page, limit)
}

export async function getAuthor(id: string) {
  const { data, error } = await getSupabase()
    .from("public_authors")
    .select("*")
    .eq("id", id)
    .single()
  if (error)
    throw new ApiError(error.message, error.code === "PGRST116" ? 404 : 500)
  return mapAuthor(data)
}

export async function getAuthorPapers(id: string, page = 1) {
  const limit = 10
  const { data, error, count } = await getSupabase()
    .from("public_research")
    .select("*", { count: "exact" })
    .contains("authors", JSON.stringify([{ id }]))
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1)
  if (error) throw new ApiError(error.message, 500)
  return paginated(data.map(mapResearch), count, page, limit)
}

export async function getSuggestions(q: string) {
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
}

type PublicResearchRow = Record<string, unknown> & {
  id: string
  title: string
  authors?: Author[]
  categories?: Category[]
  keywords?: Keyword[]
}

export function mapResearch(row: PublicResearchRow): ResearchDetail {
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract as string | null,
    publishDate: row.publish_date as string | null,
    status: row.status as ResearchSummary["status"],
    uploaderId: row.uploader_id as string | undefined,
    uploadComplete: row.upload_complete as boolean | undefined,
    viewCount: row.view_count as number,
    downloadCount: row.download_count as number,
    citationCount: row.citation_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    authors: row.authors ?? [],
    categories: row.categories ?? [],
    keywords: row.keywords ?? [],
    rank: row.rank as number | undefined,
  }
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

export async function createOwnedResearch(input: {
  title: string
  abstract: string
  publishDate?: string
  authors: Array<{ name: string; email?: string }>
  categoryIds: string[]
  keywordIds: string[]
}) {
  const { data, error } = await getSupabase().rpc("create_research_record", {
    research_title: input.title,
    research_abstract: input.abstract,
    research_publish_date: input.publishDate || undefined,
    research_authors: input.authors,
    category_ids: input.categoryIds,
    keyword_ids: input.keywordIds,
  })
  if (error) throw new ApiError(error.message, 400)
  return { id: data as string }
}

export async function getMyResearches() {
  const { data, error } = await getSupabase()
    .from("public_research")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new ApiError(error.message, 500)
  return data.map(mapResearch)
}

export async function getMyResearch(id: string) {
  const { data, error } = await getSupabase()
    .from("public_research")
    .select("*")
    .eq("id", id)
    .single()
  if (error) throw new ApiError(error.message, 404)
  return mapResearch(data)
}

export async function updateOwnedResearch(
  id: string,
  input: { title: string; abstract: string; publishDate?: string }
) {
  const { error } = await getSupabase().rpc("update_research_record", {
    target_id: id,
    research_title: input.title,
    research_abstract: input.abstract,
    research_publish_date: input.publishDate || undefined,
  })
  if (error) throw new ApiError(error.message, 400)
}

export async function deleteOwnedResearch(id: string) {
  const { error } = await getSupabase().from("researches").delete().eq("id", id)
  if (error) throw new ApiError(error.message, 400)
}

export async function callR2<T>(body: Record<string, unknown>) {
  const { data, error } = await getSupabase().functions.invoke("r2", { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as T
}
