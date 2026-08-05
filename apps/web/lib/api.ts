import type {
  DashboardData,
  ResearchDetail,
} from "@/types/api"
import type { DiscoveryModule } from "@repo/api-client"
import { getSupabase } from "@/lib/supabase"
import { createSupabaseTransportAdapter } from "@/lib/transport"
import { createDiscoveryModule, mapResearch, type PublicResearchRow } from "@repo/api-client"
export * from "@/lib/mock-dataset"

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

let discoveryInstance: DiscoveryModule | undefined

function getDiscovery(): DiscoveryModule {
  if (!discoveryInstance) {
    discoveryInstance = createDiscoveryModule(createSupabaseTransportAdapter())
  }
  return discoveryInstance
}

export async function getRecentResearch(limit = 6) {
  return getDiscovery().getRecent(limit)
}

export async function searchResearch(
  query: Record<string, string | number | undefined>
) {
  return getDiscovery().search(query)
}

export async function getResearch(id: string) {
  return getDiscovery().getDetail(id)
}

export async function getCategories() {
  return getDiscovery().getCategories()
}

export async function getCategory(id: string, page = 1) {
  return getDiscovery().getCategory(id, page)
}

export async function getKeywords() {
  return getDiscovery().getKeywords()
}

export async function getAuthors(
  query: Record<string, string | number | undefined>
) {
  return getDiscovery().getAuthors(query)
}

export async function getAuthor(id: string) {
  return getDiscovery().getAuthor(id)
}

export async function getAuthorPapers(id: string, page = 1) {
  return getDiscovery().getAuthorPapers(id, page)
}

export async function getSuggestions(q: string) {
  return getDiscovery().getSuggestions(q)
}

export async function recordEngagement(
  researchId: string,
  kind: "view" | "citation_export"
) {
  return getDiscovery().recordEngagement(researchId, kind)
}

export async function getMyResearches() {
  const supabase = getSupabase()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new ApiError("Authentication required", 401)
  const { data, error } = await supabase
    .from("public_research")
    .select("*")
    .eq("uploader_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw new ApiError(error.message, 500)
  return data.map(mapResearch)
}

export async function getMyResearch(id: string) {
  const supabase = getSupabase()
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new ApiError("Authentication required", 401)
  const { data, error } = await supabase
    .from("public_research")
    .select("*")
    .eq("id", id)
    .eq("uploader_id", user.id)
    .single()
  if (error) throw new ApiError(error.message, 404)
  return mapResearch(data)
}

export async function updateOwnedResearch(
  id: string,
  input: {
    title: string
    abstract: string
    publishDate?: string
    authors: Array<{ name: string; email?: string }>
    categoryIds: string[]
    keywordIds: string[]
  }
) {
  const { error } = await getSupabase().rpc("update_research_record", {
    target_id: id,
    research_title: input.title,
    research_abstract: input.abstract,
    research_publish_date: input.publishDate || null,
    research_authors: input.authors,
    category_ids: input.categoryIds,
    keyword_ids: input.keywordIds,
  })
  if (error) throw new ApiError(error.message, 400)
}

export async function deleteOwnedResearch(id: string) {
  const { error } = await getSupabase().from("researches").delete().eq("id", id)
  if (error) throw new ApiError(error.message, 400)
}

type R2Request =
  | {
      action: "presign-upload"
      researchId: string
      filename: string
      contentType: string
    }
  | {
      action: "confirm-upload" | "owner-download" | "moderation-download"
      researchId: string
    }
  | { action: "granted-download"; requestId: string }
  | {
      action: "email-pdf-access"
      event: "requested" | "cancel" | "approve" | "reject" | "revoke"
      requestId: string
    }
  | { action: "email-research-moderation"; researchId: string }

export async function callR2<T>(body: R2Request) {
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
  await callR2({
    action: "email-research-moderation",
    researchId: id,
  })
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
  if (table === "programs") {
    const { data, error } = await getSupabase()
      .from("programs")
      .select("id,name,institution_id")
      .order("name")
    if (error) throw new ApiError(error.message, 500)
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      institutionId: item.institution_id,
    }))
  }
  const { data, error } = await getSupabase()
    .from(table)
    .select("id,name")
    .order("name")
  if (error) throw new ApiError(error.message, 500)
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    institutionId: null,
  }))
}

export async function createMetadata(
  table: MetadataTable,
  name: string,
  institutionId?: string
) {
  const { error } = await getSupabase()
    .from(table)
    .insert(
      table === "programs"
        ? { name: name.trim(), institution_id: institutionId || null }
        : { name: name.trim() }
    )
  if (error) throw new ApiError(error.message, 400)
}

export async function renameMetadata(
  table: MetadataTable,
  id: string,
  name: string,
  institutionId?: string
) {
  const { error } = await getSupabase()
    .from(table)
    .update(
      table === "programs"
        ? { name: name.trim(), institution_id: institutionId || null }
        : { name: name.trim() }
    )
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

export async function getDashboard(
  scope: "personal" | "admin",
  period: 30 | 90
) {
  const { data, error } = await getSupabase().rpc("get_dashboard", {
    requested_scope: scope,
    requested_period: period,
  })
  if (error) throw new ApiError(error.message, 500)
  return data as DashboardData
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

