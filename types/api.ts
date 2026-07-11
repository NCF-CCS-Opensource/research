export type ApiEnvelope<T> = {
  data: T
}

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
  citationCount?: number
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

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    role: UserRole
  }
}

export type UserProfile = {
  id: string
  email: string
  firstName: string
  middleName?: string | null
  lastName: string
  suffix?: string | null
  role: UserRole
  status: string
  institution?: { id: string; name: string } | null
  program?: { id: string; name: string } | null
  createdAt?: string
}

export type AnalyticsOverview = {
  totalResearches: number
  totalUsers?: number
  totalViews: number
  totalDownloads: number
  totalCitations: number
}

export type AnalyticsPoint = {
  date: string
  count: number
}

export type NotificationItem = {
  id: string
  message: string
  read: boolean
  createdAt: string
  research?: { id: string; title: string } | null
}

export type CollectionItem = {
  researchId: string
  createdAt: string
  research: ResearchSummary & {
    researchAuthors?: Array<{ author: Author }>
    researchCategories?: Array<{ category: Category }>
  }
}

export type PdfAccessState = {
  state: "guest" | "requestable" | "pending" | "granted" | "cooldown" | "unavailable"
  requestId?: string
  availableAt?: string
  reason?: "canceled" | "rejected" | "revoked"
}

export type MyPdfAccessItem = {
  id: string
  requestNote: string
  status: string
  createdAt: string
  research: { id: string | null; title: string }
  ownerName: string
}

export type PendingPdfRequestItem = {
  id: string
  requestNote: string
  status: string
  createdAt: string
  research: { id: string; title: string }
  requester: {
    fullName: string
    institution: { id: string; name: string }
    program: { id: string; name: string } | null
  }
}

export type ActivePdfGrantItem = {
  id: string
  status: string
  createdAt: string
  grantedAt: string | null
  research: { id: string; title: string }
  requester: {
    fullName: string
    institution: { id: string; name: string }
    program: { id: string; name: string } | null
  }
}
