import { describe, expect, it } from "vitest"
import { createInMemoryTransport } from "./transport"
import { NotFoundError } from "./errors"
import { createDiscovery, createPublicQueries } from "./public-queries"

const authors = [
  { id: "a1", name: "Ada Lovelace", email: "ada@example.com", paper_count: 2 },
  { id: "a2", name: "Grace Hopper", email: "grace@example.com", paper_count: 1 },
]

const categories = [
  { id: "c1", name: "Software Engineering", research_count: 2 },
  { id: "c2", name: "History", research_count: 1 },
]

const research = [
  {
    id: "res_1",
    title: "Ada paper",
    abstract: "abstract",
    status: "approved",
    publish_date: "2026-01-02",
    view_count: 7,
    download_count: 2,
    citation_export_count: 0,
    rejection_reason: null,
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    authors: [{ id: "a1", name: "Ada Lovelace" }],
    categories: [{ id: "c1", name: "Software Engineering" }],
    keywords: [{ id: "k1", name: "math" }],
  },
  {
    id: "res_2",
    title: "Grace paper",
    abstract: "abstract",
    status: "approved",
    publish_date: "2026-02-01",
    view_count: 1,
    download_count: 0,
    citation_export_count: 0,
    rejection_reason: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
    authors: [{ id: "a2", name: "Grace Hopper" }],
    categories: [{ id: "c2", name: "History" }],
    keywords: [{ id: "k2", name: "compilers" }],
  },
  {
    id: "res_3",
    title: "Joint paper",
    abstract: "abstract",
    status: "approved",
    publish_date: "2026-03-01",
    view_count: 3,
    download_count: 1,
    citation_export_count: 1,
    rejection_reason: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    authors: [
      { id: "a1", name: "Ada Lovelace" },
      { id: "a2", name: "Grace Hopper" },
    ],
    categories: [{ id: "c1", name: "Software Engineering" }],
    keywords: [{ id: "k1", name: "math" }],
  },
]

function makeAdapter() {
  return createInMemoryTransport({
    tables: { public_authors: authors, public_categories: categories, public_research: research },
    rpc: {
      search_public_research: (params?: Record<string, unknown>) => {
        const query = String(params?.p_query ?? "").toLowerCase()
        const rows = research.filter(
          (row) => !query || row.title.toLowerCase().includes(query)
        )
        return rows.map((row) => ({ ...row, total_count: rows.length }))
      },
    },
  })
}

describe("createPublicQueries", () => {
  it("exposes discovery alongside the compatibility factory", async () => {
    const discovery = createDiscovery(makeAdapter())
    await expect(discovery.getRecentResearch(1)).resolves.toMatchObject({
      data: [expect.objectContaining({ id: "res_3" })],
    })
  })

  it("returns recent research ordered by creation date", async () => {
    const publicQueries = createPublicQueries(makeAdapter())
    const result = await publicQueries.getRecentResearch(2)
    expect(result.meta).toEqual({ total: 2, page: 1, totalPages: 1 })
    expect(result.data[0]).toMatchObject({
      id: "res_3",
      publishDate: "2026-03-01",
      viewCount: 3,
    })
  })

  it("maps search RPC rows with total count", async () => {
    const publicQueries = createPublicQueries(makeAdapter())
    const result = await publicQueries.searchResearch({ q: "Ada", page: 1, limit: 10 })
    expect(result.meta).toEqual({ total: 1, page: 1, totalPages: 1 })
    expect(result.data.map((row) => row.id)).toEqual(["res_1"])
  })

  it("throws NotFoundError when research is missing", async () => {
    const publicQueries = createPublicQueries(makeAdapter())
    await expect(publicQueries.getResearch("missing")).rejects.toBeInstanceOf(
      NotFoundError
    )
  })

  it("filters authors by search before paginating", async () => {
    const publicQueries = createPublicQueries(makeAdapter())
    const result = await publicQueries.getAuthors({ search: "ada", page: 1, limit: 1 })
    expect(result.meta).toEqual({ total: 1, page: 1, totalPages: 1 })
    expect(result.data.map((author) => author.name)).toEqual(["Ada Lovelace"])
  })

  it("returns only research in the requested category", async () => {
    const publicQueries = createPublicQueries(makeAdapter())
    const result = await publicQueries.getCategory("c1")
    expect(result.meta.total).toBe(2)
    expect(result.data.name).toBe("Software Engineering")
    expect(result.data.researches.map((row) => row.id)).toEqual(["res_3", "res_1"])
  })

  it("returns only research by the requested author", async () => {
    const publicQueries = createPublicQueries(makeAdapter())
    const result = await publicQueries.getAuthorPapers("a2", 1)
    expect(result.meta.total).toBe(2)
    expect(result.data.map((row) => row.id)).toEqual(["res_3", "res_2"])
  })
})
