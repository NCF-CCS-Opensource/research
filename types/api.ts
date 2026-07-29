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
