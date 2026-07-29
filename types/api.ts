export type UserRole = "admin" | "user"

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    total: number
    page: number
    totalPages: number
  }
}

export type ResearchSummary = {
  id: string
  title: string
  abstract?: string | null
  publishDate?: string | null
  status?: "pending" | "approved" | "rejected"
  viewCount?: number
  downloadCount?: number
  citationExportCount?: number
  createdAt?: string
  rank?: number
  rejectionReason?: string | null
  authors?: Author[]
  categories?: Category[]
}

export type ResearchDetail = ResearchSummary & {
  fileKey?: string | null
  fileName?: string | null
  uploadComplete?: boolean
  uploaderId?: string
  rejectionReason?: string | null
  updatedAt?: string
  uploader?: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: UserRole
  }
  keywords?: Keyword[]
}

export type Author = {
  id: string
  name: string
  email?: string | null
  paperCount?: number
}

export type Category = {
  id: string
  name: string
  researchCount?: number
}

export type Keyword = {
  id: string
  name: string
}

export type SearchSuggestions = {
  researches: Array<{ id: string; title: string; similarity: number }>
  authors: Array<{ id: string; name: string }>
}

export type PdfAccessState = {
  state:
    | "guest"
    | "requestable"
    | "pending"
    | "granted"
    | "cooldown"
    | "unavailable"
  requestId?: string
  availableAt?: string
  reason?: "canceled" | "rejected" | "revoked"
}

export type DashboardMetric =
  | "researchViews"
  | "authorizedDownloads"
  | "citationExports"

export type DashboardData = {
  scope: "personal" | "admin"
  mode: "reader" | "owner" | "admin"
  isAdmin: boolean
  generatedAt: string
  cards: Partial<
    Record<
      | "savedResearch"
      | "pendingPdfRequests"
      | "grantedResearchPdfs"
      | "unreadNotifications"
      | "ownedResearch"
      | "researchViews"
      | "authorizedDownloads"
      | "citationExports"
      | "readyForModeration"
      | "activeAccounts"
      | "recentRegistrations"
      | "approvedResearch"
      | "pdfAccessRequestsLast30Days",
      number
    >
  >
  docket: Array<{
    id?: string
    kind: string
    title?: string
    label?: string
    detail?: string
    count?: number
    createdAt?: string
    href: string
  }>
  recentActivity: Array<{
    kind: string
    title: string
    detail: string
    occurredAt: string
    href: string
  }>
  comparisons: Array<{
    id: string
    title: string
    researchViews: number
    authorizedDownloads: number
    citationExports: number
    pendingRequests: number
  }>
  recentAudit: Array<{
    action: string
    title: string
    createdAt: string
    href: string
  }>
  pulse: {
    period: 30 | 90
    current: Record<DashboardMetric, number>
    previous: Record<DashboardMetric, number>
    earliestAvailableDate: string | null
    days: Array<{ date: string } & Record<DashboardMetric, number>>
  } | null
}
