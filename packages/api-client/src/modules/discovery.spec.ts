import { describe, it, expect, beforeEach } from "vitest"
import { InMemoryTransportAdapter, type InMemoryStore } from "../test-double"
import { createDiscoveryModule, type DiscoveryModule } from "./discovery"
import { DomainApiError, NotFoundError } from "../errors"

const CATEGORIES = [
  { id: "cat-1", name: "Software Engineering", research_count: 4 },
  { id: "cat-2", name: "Data Science", research_count: 3 },
  { id: "cat-3", name: "AI & ML", research_count: 5 },
]

const AUTHORS = [
  { id: "auth-1", name: "Ada Lovelace", email: "ada@test.com", paper_count: 3 },
  { id: "auth-2", name: "Grace Hopper", email: "grace@test.com", paper_count: 2 },
  { id: "auth-3", name: "Alan Turing", email: "alan@test.com", paper_count: 1 },
]

const KEYWORDS = [
  { id: "kw-1", name: "Machine Learning" },
  { id: "kw-2", name: "Cybersecurity" },
  { id: "kw-3", name: "Cloud Architecture" },
]

const RESEARCHES = [
  {
    id: "res-1",
    title: "Accessible Research Discovery",
    abstract: "A public computing archive",
    publish_date: "2026-01-15",
    status: "approved",
    upload_complete: true,
    uploader_id: "user-1",
    view_count: 124,
    download_count: 42,
    citation_export_count: 18,
    rejection_reason: null,
    created_at: "2026-01-15T08:00:00.000Z",
    updated_at: "2026-01-16T10:00:00.000Z",
    authors: [AUTHORS[0], AUTHORS[1]],
    categories: [CATEGORIES[0]],
    keywords: [KEYWORDS[0]],
  },
  {
    id: "res-2",
    title: "Ethical Machine Learning",
    abstract: "Practical safeguards",
    publish_date: "2026-02-01",
    status: "approved",
    upload_complete: true,
    uploader_id: "user-2",
    view_count: 98,
    download_count: 31,
    citation_export_count: 14,
    rejection_reason: null,
    created_at: "2026-02-01T09:00:00.000Z",
    updated_at: "2026-02-02T11:00:00.000Z",
    authors: [AUTHORS[1], AUTHORS[2]],
    categories: [CATEGORIES[1], CATEGORIES[2]],
    keywords: [KEYWORDS[1]],
  },
  {
    id: "res-3",
    title: "Deep Learning for NLP",
    abstract: "Transformer architectures",
    publish_date: "2026-03-01",
    status: "approved",
    upload_complete: true,
    uploader_id: "user-1",
    view_count: 154,
    download_count: 68,
    citation_export_count: 27,
    rejection_reason: null,
    created_at: "2026-03-01T11:00:00.000Z",
    updated_at: "2026-03-02T13:00:00.000Z",
    authors: [AUTHORS[0]],
    categories: [CATEGORIES[2]],
    keywords: [KEYWORDS[0], KEYWORDS[1]],
  },
]

function createStore(): InMemoryStore {
  return {
    public_research: RESEARCHES.map((r) => ({ ...r })),
    public_categories: CATEGORIES.map((c) => ({ ...c })),
    public_authors: AUTHORS.map((a) => ({ ...a })),
    keywords: KEYWORDS.map((k) => ({ ...k })),
  }
}

function createTestModule(store?: InMemoryStore): {
  discovery: DiscoveryModule
  transport: InMemoryTransportAdapter
} {
  const initialStore = store ?? createStore()
  const transport = new InMemoryTransportAdapter(initialStore)

  transport.registerRpc("search_public_research", (_fn, params) => {
    const pLimit = (params.p_limit as number) ?? 10
    const pOffset = (params.p_offset as number) ?? 0
    const pQuery = (params.p_query as string) ?? ""

    let rows = [...(initialStore.public_research ?? [])]

    if (pQuery) {
      rows = rows.filter(
        (r) =>
          (r.title as string).toLowerCase().includes(pQuery.toLowerCase()) ||
          (r.abstract as string)?.toLowerCase().includes(pQuery.toLowerCase())
      )
    }

    const total = rows.length
    const sliced = rows.slice(pOffset, pOffset + pLimit)

    return sliced.map((r, i) => ({
      ...r,
      total_count: total,
      rank: pQuery ? 1 - i * 0.1 : undefined,
    }))
  })

  transport.registerRpc("record_engagement", (_fn, params) => {
    const researchId = params.target_research_id as string
    const kind = params.kind as string
    const research = (initialStore.public_research ?? []).find(
      (r) => r.id === researchId
    )
    if (!research) throw new Error("Research not found")
    if (kind === "view") {
      research.view_count = ((research.view_count as number) ?? 0) + 1
    } else if (kind === "citation_export") {
      research.citation_export_count =
        ((research.citation_export_count as number) ?? 0) + 1
    }
    return null
  })

  const discovery = createDiscoveryModule(transport)
  return { discovery, transport }
}

describe("DiscoveryModule", () => {
  describe("search", () => {
    it("returns paginated results for basic query", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.search({ q: "learning", page: 1, limit: 10 })

      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
    })

    it("returns empty results for non-matching query", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.search({ q: "nonexistent", page: 1, limit: 10 })

      expect(result.data).toHaveLength(0)
      expect(result.meta.total).toBe(0)
      expect(result.meta.totalPages).toBe(0)
    })

    it("paginates results correctly", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.search({ q: "", page: 1, limit: 2 })

      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBe(3)
      expect(result.meta.totalPages).toBe(2)
    })

    it("returns second page of results", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.search({ q: "", page: 2, limit: 2 })

      expect(result.data).toHaveLength(1)
      expect(result.meta.page).toBe(2)
    })

    it("probes total count when page is beyond results", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.search({ q: "", page: 5, limit: 10 })

      expect(result.data).toHaveLength(0)
      expect(result.meta.total).toBe(3)
      expect(result.meta.totalPages).toBe(1)
    })

    it("defaults page to 1 and limit to 10", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.search({})

      expect(result.meta.page).toBe(1)
      expect(result.data.length).toBeLessThanOrEqual(10)
    })

    it("maps research fields correctly", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.search({ q: "Accessible", page: 1, limit: 1 })

      expect(result.data[0]).toMatchObject({
        id: "res-1",
        title: "Accessible Research Discovery",
        abstract: "A public computing archive",
        viewCount: 124,
        downloadCount: 42,
        citationExportCount: 18,
      })
    })
  })

  describe("getRecent", () => {
    it("returns recent research ordered by created_at desc", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getRecent(6)

      expect(result.data).toHaveLength(3)
      expect(result.data[0].id).toBe("res-3")
      expect(result.data[2].id).toBe("res-1")
    })

    it("defaults to limit 6", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getRecent()

      expect(result.data).toHaveLength(3)
      expect(result.meta.total).toBe(3)
    })

    it("respects custom limit", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getRecent(2)

      expect(result.data).toHaveLength(2)
    })
  })

  describe("getDetail", () => {
    it("returns research detail for existing id", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getDetail("res-1")

      expect(result.id).toBe("res-1")
      expect(result.title).toBe("Accessible Research Discovery")
      expect(result.authors).toHaveLength(2)
    })

    it("throws NotFoundError for non-existent id", async () => {
      const { discovery } = createTestModule()

      await expect(discovery.getDetail("nonexistent")).rejects.toThrow(
        NotFoundError
      )
    })
  })

  describe("getCategories", () => {
    it("returns all categories ordered by name", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getCategories()

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe("AI & ML")
      expect(result[2].name).toBe("Software Engineering")
    })

    it("maps category fields correctly", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getCategories()

      expect(result[0]).toMatchObject({
        id: "cat-3",
        name: "AI & ML",
        researchCount: 5,
      })
    })
  })

  describe("getCategory", () => {
    it("returns category with its researches", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getCategory("cat-3")

      expect(result.data.id).toBe("cat-3")
      expect(result.data.name).toBe("AI & ML")
      expect(result.data.researches).toHaveLength(2)
    })

    it("throws NotFoundError for non-existent category", async () => {
      const { discovery } = createTestModule()

      await expect(discovery.getCategory("nonexistent")).rejects.toThrow(
        NotFoundError
      )
    })

    it("paginates category researches", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getCategory("cat-3", 1)

      expect(result.meta.page).toBe(1)
      expect(result.meta.total).toBe(2)
    })
  })

  describe("getKeywords", () => {
    it("returns all keywords ordered by name", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getKeywords()

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe("Cloud Architecture")
      expect(result[2].name).toBe("Machine Learning")
    })
  })

  describe("getAuthors", () => {
    it("returns paginated authors", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getAuthors({ page: 1, limit: 10 })

      expect(result.data).toHaveLength(3)
      expect(result.meta.total).toBe(3)
    })

    it("filters authors by search term", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getAuthors({ search: "ada", page: 1, limit: 10 })

      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe("Ada Lovelace")
    })

    it("maps author fields correctly", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getAuthors({ page: 1, limit: 1 })

      expect(result.data[0]).toMatchObject({
        id: "auth-1",
        name: "Ada Lovelace",
        email: "ada@test.com",
        paperCount: 3,
      })
    })
  })

  describe("getAuthor", () => {
    it("returns author by id", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getAuthor("auth-2")

      expect(result.id).toBe("auth-2")
      expect(result.name).toBe("Grace Hopper")
    })

    it("throws NotFoundError for non-existent author", async () => {
      const { discovery } = createTestModule()

      await expect(discovery.getAuthor("nonexistent")).rejects.toThrow(
        NotFoundError
      )
    })
  })

  describe("getAuthorPapers", () => {
    it("returns papers by author", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getAuthorPapers("auth-1")

      expect(result.data).toHaveLength(2)
      expect(result.meta.total).toBe(2)
    })

    it("returns empty for author with no papers", async () => {
      const store = createStore()
      store.public_research = []
      const { discovery } = createTestModule(store)
      const result = await discovery.getAuthorPapers("auth-1")

      expect(result.data).toHaveLength(0)
      expect(result.meta.total).toBe(0)
    })
  })

  describe("getSuggestions", () => {
    it("returns combined research and author suggestions", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getSuggestions("learning")

      expect(result.researches.length).toBeGreaterThan(0)
      expect(result.authors.length).toBe(0)
    })

    it("returns author suggestions when author name matches", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getSuggestions("Ada")

      expect(result.authors.length).toBe(1)
      expect(result.authors[0].name).toBe("Ada Lovelace")
    })

    it("includes similarity score for research suggestions", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getSuggestions("machine")

      for (const r of result.researches) {
        expect(r).toHaveProperty("id")
        expect(r).toHaveProperty("title")
        expect(r).toHaveProperty("similarity")
      }
    })

    it("limits research suggestions to 4", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getSuggestions("")

      expect(result.researches.length).toBeLessThanOrEqual(4)
    })

    it("limits author suggestions to 3", async () => {
      const { discovery } = createTestModule()
      const result = await discovery.getSuggestions("")

      expect(result.authors.length).toBeLessThanOrEqual(3)
    })
  })

  describe("recordEngagement", () => {
    it("increments view count", async () => {
      const { discovery, transport } = createTestModule()
      await discovery.recordEngagement("res-1", "view")

      const store = transport.getTable("public_research")
      const research = store.find((r) => r.id === "res-1")
      expect(research?.view_count).toBe(125)
    })

    it("increments citation export count", async () => {
      const { discovery, transport } = createTestModule()
      await discovery.recordEngagement("res-1", "citation_export")

      const store = transport.getTable("public_research")
      const research = store.find((r) => r.id === "res-1")
      expect(research?.citation_export_count).toBe(19)
    })

    it("throws on non-existent research", async () => {
      const { discovery } = createTestModule()

      await expect(
        discovery.recordEngagement("nonexistent", "view")
      ).rejects.toThrow(DomainApiError)
    })

    it("handles view count starting from undefined", async () => {
      const store = createStore()
      store.public_research[0].view_count = undefined
      const { discovery, transport } = createTestModule(store)

      await discovery.recordEngagement("res-1", "view")

      const rows = transport.getTable("public_research")
      const research = rows.find((r) => r.id === "res-1")
      expect(research?.view_count).toBe(1)
    })
  })

  describe("error handling", () => {
    it("wraps transport errors as DomainApiError", async () => {
      const store = createStore()
      const transport = new InMemoryTransportAdapter(store)
      transport.registerRpc("search_public_research", () => {
        throw new Error("Database connection failed")
      })

      const discovery = createDiscoveryModule(transport)

      await expect(discovery.search({ q: "test" })).rejects.toThrow(
        DomainApiError
      )
    })

    it("includes status code in error", async () => {
      const store = createStore()
      const transport = new InMemoryTransportAdapter(store)
      transport.registerRpc("search_public_research", () => {
        throw new Error("Permission denied")
      })

      const discovery = createDiscoveryModule(transport)

      try {
        await discovery.search({ q: "test" })
        expect.fail("Should have thrown")
      } catch (err) {
        expect(err).toBeInstanceOf(DomainApiError)
        expect((err as DomainApiError).status).toBe(500)
      }
    })
  })
})
