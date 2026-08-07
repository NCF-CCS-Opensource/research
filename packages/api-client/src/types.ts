export type UserRole = "user" | "admin"
export type AccountStatus = "active" | "suspended"
export type ResearchStatus = "pending" | "approved" | "rejected"

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

export type ResearchDetail = {
  id: string
  title: string
  abstract: string | null
  publishDate: string | null
  status: ResearchStatus
  uploaderId?: string
  uploadComplete?: boolean
  viewCount: number
  downloadCount: number
  citationExportCount: number
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  authors: Author[]
  categories: Category[]
  keywords: Keyword[]
  rank?: number
}

export type ResearchRow = Record<string, unknown> & {
  id: string
  title: string
  authors?: Author[]
  categories?: Category[]
  keywords?: Keyword[]
}

export type AuditLog = {
  id: string
  admin_id: string
  research_id: string | null
  action: string
  meta: unknown
  created_at: string
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

export type PdfRequestMineItem = {
  id: string
  researchId: string | null
  researchTitle: string
  ownerName: string
  requestNote: string
  status: string
  createdAt: string
}

export type PdfRequestOwnerItem = {
  id: string
  researchId: string
  researchTitle: string
  requesterName: string
  requesterInstitution: string
  requesterProgram: string | null
  requestNote: string
  status: string
  createdAt: string
}

export type PdfGrantItem = PdfRequestOwnerItem & {
  grantedAt: string
}

export type PdfAccessDashboard = {
  mine: PdfRequestMineItem[]
  pending: PdfRequestOwnerItem[]
  grants: PdfGrantItem[]
}

export type MetadataTable =
  | "categories"
  | "keywords"
  | "institutions"
  | "programs"

export type MetadataItem = {
  id: string
  name: string
  institutionId: string | null
}

export type ProfileSettings = {
  profile: {
    first_name: string
    middle_name: string | null
    last_name: string
    suffix: string | null
    email: string
    institution_id: string | null
    custom_institution: string | null
    program_id: string | null
    custom_program: string | null
  }
  institutions: MetadataItem[]
  programs: Array<{ id: string; name: string; institutionId: string | null }>
}

export type ProfileSettingsInput = {
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  institution_id: string | null
  custom_institution: string | null
  program_id: string | null
  custom_program: string | null
}

export type AccountProfile = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  status: AccountStatus
}

export type AccountAccess = {
  role: UserRole
  status: AccountStatus
}

export type CollectionItem = {
  researchId: string
  createdAt: string
  research: ResearchDetail
}

export type Notification = {
  id: string
  user_id: string
  research_id: string | null
  message: string
  read: boolean
  created_at: string
}

export function mapResearch(row: ResearchRow): ResearchDetail {
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract as string | null,
    publishDate: row.publish_date as string | null,
    status: row.status as ResearchDetail["status"],
    uploaderId: row.uploader_id as string | undefined,
    uploadComplete: row.upload_complete as boolean | undefined,
    viewCount: row.view_count as number,
    downloadCount: row.download_count as number,
    citationExportCount: row.citation_export_count as number,
    rejectionReason: row.rejection_reason as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    authors: row.authors ?? [],
    categories: row.categories ?? [],
    keywords: row.keywords ?? [],
    rank: row.rank as number | undefined,
  }
}
