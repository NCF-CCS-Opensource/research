import type {
  Author,
  Category,
  Keyword,
  PaginatedResponse,
  ResearchDetail,
  ResearchSummary,
  SearchSuggestions,
} from "@/types/api"
import { getSupabase } from "@/lib/supabase"

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
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
  return paginated(rows.map(mapResearch), total, page, limit)
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
    rejectionReason: row.rejection_reason as string | null,
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
    research_publish_date: input.publishDate || null,
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
    research_publish_date: input.publishDate || null,
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

export async function getAdminResearches(status?: string) {
  let request = getSupabase()
    .from("public_research")
    .select("*")
    .order("created_at", { ascending: false })
  if (status) request = request.eq("status", status)
  const { data, error } = await request
  if (error) throw new ApiError(error.message, 500)
  return data.map(mapResearch)
}

export async function moderateResearch(
  id: string,
  decision: "approved" | "rejected",
  reason?: string
) {
  const { error } = await getSupabase().rpc("moderate_research", {
    target_id: id,
    decision,
    reason,
  })
  if (error) throw new ApiError(error.message, 400)
}

export async function resubmitResearch(id: string) {
  const { error } = await getSupabase().rpc("resubmit_research", {
    target_id: id,
  })
  if (error) throw new ApiError(error.message, 400)
}

export async function getProfiles() {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id,email,first_name,last_name,role,status")
    .order("created_at")
  if (error) throw new ApiError(error.message, 500)
  return data
}

export async function updateAccount(
  id: string,
  role: "user" | "admin",
  status: "active" | "suspended"
) {
  const { error } = await getSupabase().rpc("admin_update_account", {
    target_id: id,
    new_role: role,
    new_status: status,
  })
  if (error) throw new ApiError(error.message, 400)
}

export type MetadataTable =
  | "categories"
  | "keywords"
  | "institutions"
  | "programs"

export async function getMetadata(table: MetadataTable) {
  const { data, error } = await getSupabase()
    .from(table)
    .select("id,name")
    .order("name")
  if (error) throw new ApiError(error.message, 500)
  return data as Array<{ id: string; name: string }>
}

export async function createMetadata(table: MetadataTable, name: string) {
  const { error } = await getSupabase()
    .from(table)
    .insert({ name: name.trim() })
  if (error) throw new ApiError(error.message, 400)
}

export async function renameMetadata(
  table: MetadataTable,
  id: string,
  name: string
) {
  const { error } = await getSupabase()
    .from(table)
    .update({ name: name.trim() })
    .eq("id", id)
  if (error) throw new ApiError(error.message, 400)
}

export async function deleteMetadata(table: MetadataTable, id: string) {
  const { error } = await getSupabase().from(table).delete().eq("id", id)
  if (error) throw new ApiError(error.message, 400)
}

export async function addToCollection(researchId: string) {
  const { data: auth } = await getSupabase().auth.getUser()
  if (!auth.user) throw new ApiError("Authentication required", 401)
  const { error } = await getSupabase()
    .from("collections")
    .upsert(
      { user_id: auth.user.id, research_id: researchId },
      { onConflict: "user_id,research_id", ignoreDuplicates: true }
    )
  if (error) throw new ApiError(error.message, 400)
}

export async function removeFromCollection(researchId: string) {
  const { error } = await getSupabase()
    .from("collections")
    .delete()
    .eq("research_id", researchId)
  if (error) throw new ApiError(error.message, 400)
}

export async function getCollection() {
  const { data: saved, error } = await getSupabase()
    .from("collections")
    .select("research_id,created_at")
    .order("created_at", { ascending: false })
  if (error) throw new ApiError(error.message, 500)
  const ids = saved.map(({ research_id }) => research_id)
  if (!ids.length) return []
  const { data: research, error: researchError } = await getSupabase()
    .from("public_research")
    .select("*")
    .in("id", ids)
  if (researchError) throw new ApiError(researchError.message, 500)
  const byId = new Map(research.map((row) => [row.id, mapResearch(row)]))
  return saved.flatMap((item) => {
    const record = byId.get(item.research_id)
    return record
      ? [
          {
            researchId: item.research_id,
            createdAt: item.created_at,
            research: record,
          },
        ]
      : []
  })
}

export async function getAuditLogs() {
  const { data, error } = await getSupabase()
    .from("audit_logs")
    .select("id,admin_id,research_id,action,meta,created_at")
    .order("created_at", { ascending: false })
  if (error) throw new ApiError(error.message, 500)
  return data
}

export type PdfAccessDashboard = {
  mine: Array<{
    id: string
    researchId: string | null
    researchTitle: string
    ownerName: string
    requestNote: string
    status: string
    createdAt: string
  }>
  pending: Array<{
    id: string
    researchId: string
    researchTitle: string
    requesterName: string
    requesterInstitution: string
    requesterProgram: string | null
    requestNote: string
    status: string
    createdAt: string
  }>
  grants: Array<{
    id: string
    researchId: string
    researchTitle: string
    requesterName: string
    requesterInstitution: string
    requesterProgram: string | null
    status: string
    createdAt: string
    grantedAt: string
  }>
}

export async function getPdfAccessState(researchId: string) {
  const { data, error } = await getSupabase().rpc("get_pdf_access_state", {
    target_research_id: researchId,
  })
  if (error) throw new ApiError(error.message, 400)
  return data as import("@/types/api").PdfAccessState
}

export async function createPdfRequest(researchId: string, note: string) {
  const { data, error } = await getSupabase().rpc("create_pdf_request", {
    target_research_id: researchId,
    note,
  })
  if (error) throw new ApiError(error.message, 400)
  void callR2({
    action: "email-pdf-access",
    event: "requested",
    requestId: data,
  }).catch(() => {})
  return { id: data as string, status: "pending" }
}

export async function transitionPdfRequest(
  requestId: string,
  action: "cancel" | "approve" | "reject" | "revoke"
) {
  const { data, error } = await getSupabase().rpc("transition_pdf_request", {
    target_request_id: requestId,
    action,
  })
  if (error) throw new ApiError(error.message, 400)
  void callR2({ action: "email-pdf-access", event: action, requestId }).catch(
    () => {}
  )
  return data as string
}

export async function getPdfAccessDashboard() {
  const { data, error } = await getSupabase().rpc("get_pdf_access_dashboard")
  if (error) throw new ApiError(error.message, 500)
  return data as PdfAccessDashboard
}

export async function getNotifications() {
  const { data, error } = await getSupabase().rpc("get_notifications")
  if (error) throw new ApiError(error.message, 500)
  return data as Array<{
    id: string
    user_id: string
    research_id: string | null
    message: string
    read: boolean
    created_at: string
  }>
}

export async function markNotificationsRead() {
  const { error } = await getSupabase().rpc("mark_notifications_read")
  if (error) throw new ApiError(error.message, 400)
}

export async function recordEngagement(
  researchId: string,
  kind: "view" | "citation"
) {
  const { error } = await getSupabase().rpc("record_engagement", {
    target_research_id: researchId,
    kind,
  })
  if (error) throw new ApiError(error.message, 400)
}

export async function getEngagementOverview() {
  const { data, error } = await getSupabase().rpc("get_engagement_overview")
  if (error) throw new ApiError(error.message, 500)
  return data as {
    totalResearches: number
    totalViews: number
    totalDownloads: number
    totalCitations: number
    totalUsers: number | null
  }
}

export async function getRegistrationOptions() {
  const [institutions, programs] = await Promise.all([
    getMetadata("institutions"),
    getMetadata("programs"),
  ])
  return { institutions, programs }
}

export async function getProfileAccess(id: string) {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("role,status")
    .eq("id", id)
    .single()
  if (error) throw new ApiError(error.message, 500)
  return data as { role: "user" | "admin"; status: "active" | "suspended" }
}

export async function getProfileSettings() {
  const supabase = getSupabase()
  const [{ data: profile, error }, options] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "first_name,middle_name,last_name,suffix,institution_id,program_id"
      )
      .single(),
    getRegistrationOptions(),
  ])
  if (error) throw new ApiError(error.message, 500)
  return { profile, ...options }
}

export async function updateProfileSettings(input: {
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  institution_id: string | null
  program_id: string | null
}) {
  const supabase = getSupabase()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new ApiError("Authentication required", 401)
  const { error } = await supabase
    .from("profiles")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", user.id)
  if (error) throw new ApiError(error.message, 400)
}
