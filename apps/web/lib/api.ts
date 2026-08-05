import type {
  DashboardData,
  ResearchDetail,
  SearchSuggestions,
} from "@/types/api"
import type { DiscoveryModule } from "@repo/api-client"
import { getSupabase } from "@/lib/supabase"
import {
  createAccountWorkspace,
  createPdfAccess,
  createResearchLifecycle,
  mapResearch,
  normalizeDomainError,
  type InsertOptions,
  type MetadataItem,
  type MetadataTable,
  type ResearchRow,
  type ResearchStatus,
  type SelectOptions,
  type TransportAdapter,
} from "@repo/api-client"

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

const webTransport: TransportAdapter = {
  getCurrentUserId: async () =>
    (await getSupabase().auth.getUser()).data.user?.id ?? null,
  async rpc<T>(fn: string, params?: Record<string, unknown>): Promise<T> {
    const { data, error } = await getSupabase().rpc(fn, params)
    if (error) throw normalizeDomainError(error.message, error.code, 500)
    return data as T
  },
  async select<T>(table: string, opts: SelectOptions = {}): Promise<T[]> {
    let query = getSupabase().from(table).select(opts.columns ?? "*")
    if (opts.eq) {
      for (const [key, value] of Object.entries(opts.eq)) {
        query = query.eq(key, value)
      }
    }
    if (opts.in) query = query.in(opts.in.column, opts.in.values)
    if (opts.order)
      query = query.order(opts.order.column, {
        ascending: opts.order.ascending ?? true,
      })
    if (opts.range) query = query.range(opts.range.from, opts.range.to)
    const { data, error } = await query
    if (error) throw normalizeDomainError(error.message, error.code, 500)
    return data as T[]
  },
  async selectOne<T>(table: string, opts: SelectOptions = {}): Promise<T> {
    let query = getSupabase().from(table).select(opts.columns ?? "*")
    if (opts.eq) {
      for (const [key, value] of Object.entries(opts.eq)) {
        query = query.eq(key, value)
      }
    }
    if (opts.in) query = query.in(opts.in.column, opts.in.values)
    const { data, error } = await query.single()
    if (error) throw normalizeDomainError(error.message, error.code, 500)
    return data as T
  },
  async insert(
    table: string,
    rows: Record<string, unknown> | Record<string, unknown>[],
    opts?: InsertOptions
  ): Promise<unknown[]> {
    const supabase = getSupabase()
    const query = opts?.upsert
      ? supabase.from(table).upsert(rows, {
          onConflict: opts.onConflict,
          ignoreDuplicates: true,
        })
      : supabase.from(table).insert(rows)
    const { data, error } = await query
    if (error) throw normalizeDomainError(error.message, error.code, 400)
    return (data ?? []) as unknown[]
  },
  async update(
    table: string,
    values: Record<string, unknown>,
    eq: Record<string, unknown>
  ): Promise<void> {
    let query = getSupabase().from(table).update(values)
    for (const [key, value] of Object.entries(eq)) {
      query = query.eq(key, value)
    }
    const { error } = await query
    if (error) throw normalizeDomainError(error.message, error.code, 400)
  },
  async remove(
    table: string,
    eq: Record<string, unknown>
  ): Promise<void> {
    let query = getSupabase().from(table).delete()
    for (const [key, value] of Object.entries(eq)) {
      query = query.eq(key, value)
    }
    const { error } = await query
    if (error) throw normalizeDomainError(error.message, error.code, 400)
  },
  async invokeEdge<T>(
    action: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    return callR2<T>({ action, ...params })
  },
}

export { webTransport }

export const researchLifecycle = createResearchLifecycle(webTransport)
export const pdfAccess = createPdfAccess(webTransport)
export const accountWorkspace = createAccountWorkspace(webTransport)

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

type PublicResearchRow = ResearchRow

export { mapResearch }

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

export async function getMyResearches() {
  return researchLifecycle.getOwnerRecords()
}

export async function getMyResearch(id: string) {
  return researchLifecycle.getOwnerRecord(id)
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
  await researchLifecycle.updateRecord(id, input)
}

export async function deleteOwnedResearch(id: string) {
  await researchLifecycle.deleteRecord(id)
}

export async function callR2<T>(
  body: { action: string } & Record<string, unknown>
) {
  const { data, error } = await getSupabase().functions.invoke("r2", { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as T
}

const RESEARCH_STATUSES: readonly string[] = ["pending", "approved", "rejected"]

export async function getAdminResearches(status?: string) {
  const valid = status && RESEARCH_STATUSES.includes(status)
  return researchLifecycle.getAdminQueue(
    valid ? (status as ResearchStatus) : undefined
  )
}

export async function moderateResearch(
  id: string,
  decision: "approved" | "rejected",
  reason?: string
) {
  await researchLifecycle.moderate(id, decision, reason)
}

export async function resubmitResearch(id: string) {
  await researchLifecycle.resubmitRecord(id)
}

export async function getProfiles() {
  return accountWorkspace.getProfiles()
}

export async function updateAccount(
  id: string,
  role: "user" | "admin",
  status: "active" | "suspended"
) {
  await accountWorkspace.updateAccount(id, role, status)
}

export type { MetadataTable, MetadataItem }

export async function getMetadata(table: MetadataTable) {
  return accountWorkspace.manageMetadata<MetadataItem[]>({
    action: "list",
    table,
  })
}

export async function createMetadata(
  table: MetadataTable,
  name: string,
  institutionId?: string
) {
  await accountWorkspace.manageMetadata({
    action: "create",
    table,
    name,
    institutionId,
  })
}

export async function renameMetadata(
  table: MetadataTable,
  id: string,
  name: string,
  institutionId?: string
) {
  await accountWorkspace.manageMetadata({
    action: "rename",
    table,
    id,
    name,
    institutionId,
  })
}

export async function deleteMetadata(table: MetadataTable, id: string) {
  await accountWorkspace.manageMetadata({ action: "delete", table, id })
}

export async function addToCollection(researchId: string) {
  await accountWorkspace.addToCollection(researchId)
}

export async function removeFromCollection(researchId: string) {
  await accountWorkspace.removeFromCollection(researchId)
}

export async function getCollection() {
  return accountWorkspace.getCollection()
}

export async function getAuditLogs() {
  return researchLifecycle.getAuditLogs()
}

export type PdfAccessDashboard = import("@repo/api-client").PdfAccessDashboard

export async function getPdfAccessState(researchId: string) {
  return pdfAccess.getAccessState(researchId)
}

export async function createPdfRequest(researchId: string, note: string) {
  return pdfAccess.requestAccess(researchId, note)
}

export async function transitionPdfRequest(
  requestId: string,
  action: "cancel" | "approve" | "reject" | "revoke"
) {
  return pdfAccess.transitionRequest(requestId, action)
}

export async function getPdfAccessDashboard() {
  return pdfAccess.getAccessDashboard()
}

export async function getAuthorizedDownloadUrl(requestId: string) {
  return pdfAccess.getAuthorizedDownloadUrl(requestId)
}

export async function getOwnerDownloadUrl(researchId: string) {
  return pdfAccess.getOwnerDownloadUrl(researchId)
}

export async function getModerationDownloadUrl(researchId: string) {
  return pdfAccess.getModerationDownloadUrl(researchId)
}

export async function getNotifications() {
  return accountWorkspace.getNotifications()
}

export async function markNotificationsRead() {
  await accountWorkspace.markNotificationsRead()
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
  return accountWorkspace.getProfileAccess(id)
}

export async function getProfileSettings() {
  return accountWorkspace.getProfileSettings()
}

export async function updateProfileSettings(input: {
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  institution_id: string | null
  program_id: string | null
}) {
  await accountWorkspace.updateProfileSettings(input)
}

