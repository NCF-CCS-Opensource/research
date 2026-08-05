import type { Author, Category, Keyword, PaginatedResponse, ResearchDetail, ResearchSummary } from "./types"

export type PublicResearchRow = Record<string, unknown> & {
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

export function mapAuthor(row: Record<string, unknown>): Author {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string | null,
    paperCount: row.paper_count as number,
  }
}

export function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    researchCount: row.research_count as number,
  }
}

export function paginated<T>(
  data: T[],
  count: number | null,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const total = count ?? 0
  return { data, meta: { total, page, totalPages: Math.ceil(total / limit) } }
}

export function positiveNumber(value: string | number | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function optionalString(value: string | number | undefined) {
  const result = value === undefined ? "" : String(value).trim()
  return result || undefined
}
