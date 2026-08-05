import { describe, expect, it } from "vitest"
import {
  MOCK_AUTHORS,
  MOCK_CATEGORIES,
  MOCK_KEYWORDS,
  MOCK_RESEARCHES,
  getMockApprovedResearches,
  getMockAuthor,
  getMockAuthorPapers,
  getMockAuthors,
  getMockCategories,
  getMockCategory,
  getMockDashboard,
  getMockKeywords,
  getMockNotifications,
  getMockPdfAccessDashboard,
  getMockRecentResearch,
  getMockResearch,
  getMockSuggestions,
  searchMockResearch,
} from "./mock-dataset"

describe("Mock Dataset", () => {
  it("provides realistic research records with full metadata", () => {
    expect(MOCK_RESEARCHES.length).toBeGreaterThanOrEqual(8)
    const approved = getMockApprovedResearches()
    expect(approved.length).toBeGreaterThanOrEqual(6)

    const paper = approved[0]
    expect(paper).toHaveProperty("id")
    expect(paper).toHaveProperty("title")
    expect(paper).toHaveProperty("abstract")
    expect(paper).toHaveProperty("publishDate")
    expect(paper).toHaveProperty("status", "approved")
    expect(paper.authors).toBeDefined()
    expect(paper.authors!.length).toBeGreaterThan(0)
    expect(paper.categories).toBeDefined()
    expect(paper.categories!.length).toBeGreaterThan(0)
    expect(paper.keywords).toBeDefined()
    expect(paper.viewCount).toBeGreaterThanOrEqual(0)
    expect(paper.downloadCount).toBeGreaterThanOrEqual(0)
    expect(paper.citationExportCount).toBeGreaterThanOrEqual(0)
  })

  it("filters and hides private drafts (pending/rejected) from public search by default", () => {
    const results = searchMockResearch()
    expect(results.data.every((r) => r.status === "approved")).toBe(true)

    const titles = results.data.map((r) => r.title)
    expect(titles).not.toContain("Pending Private Draft")
    expect(titles).not.toContain("Rejected Private Draft")
  })

  describe("Search and Filtering", () => {
    it("searches research by keyword query in title", () => {
      const results = searchMockResearch({ q: "Accessible" })
      expect(results.data.length).toBeGreaterThan(0)
      expect(results.data[0].title).toContain("Accessible")
    })

    it("searches research by author name", () => {
      const results = searchMockResearch({ q: "Lovelace" })
      expect(results.data.length).toBeGreaterThan(0)
      expect(
        results.data.some((r) =>
          r.authors?.some((a) => a.name.includes("Lovelace"))
        )
      ).toBe(true)
    })

    it("filters research by category", () => {
      const seCategory = MOCK_CATEGORIES[0] // Software Engineering
      const results = searchMockResearch({ category: seCategory.id })
      expect(results.data.length).toBeGreaterThan(0)
      expect(
        results.data.every((r) =>
          r.categories?.some((c) => c.id === seCategory.id)
        )
      ).toBe(true)
    })

    it("filters research by keyword", () => {
      const mlKeyword = MOCK_KEYWORDS[1] // Machine Learning
      const results = searchMockResearch({ keyword: mlKeyword.id })
      expect(results.data.length).toBeGreaterThan(0)
      expect(
        results.data.every((r) =>
          r.keywords?.some((k) => k.id === mlKeyword.id)
        )
      ).toBe(true)
    })

    it("filters research by author ID", () => {
      const author = MOCK_AUTHORS[0] // Ada Lovelace
      const results = searchMockResearch({ author: author.id })
      expect(results.data.length).toBeGreaterThan(0)
      expect(
        results.data.every((r) =>
          r.authors?.some((a) => a.id === author.id)
        )
      ).toBe(true)
    })

    it("filters research by publication date range", () => {
      const results = searchMockResearch({
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
      })
      expect(results.data.length).toBeGreaterThan(0)
      expect(
        results.data.every(
          (r) =>
            r.publishDate! >= "2026-03-01" && r.publishDate! <= "2026-03-31"
        )
      ).toBe(true)
    })

    it("sorts research by date descending", () => {
      const results = searchMockResearch({ sort: "date" })
      for (let i = 1; i < results.data.length; i++) {
        const prev = results.data[i - 1].publishDate!
        const curr = results.data[i].publishDate!
        expect(prev >= curr).toBe(true)
      }
    })

    it("sorts research by views descending", () => {
      const results = searchMockResearch({ sort: "views" })
      for (let i = 1; i < results.data.length; i++) {
        const prev = results.data[i - 1].viewCount ?? 0
        const curr = results.data[i].viewCount ?? 0
        expect(prev >= curr).toBe(true)
      }
    })

    it("sorts research by downloads descending", () => {
      const results = searchMockResearch({ sort: "downloads" })
      for (let i = 1; i < results.data.length; i++) {
        const prev = results.data[i - 1].downloadCount ?? 0
        const curr = results.data[i].downloadCount ?? 0
        expect(prev >= curr).toBe(true)
      }
    })

    it("paginates search results correctly", () => {
      const page1 = searchMockResearch({ limit: 3, page: 1 })
      const page2 = searchMockResearch({ limit: 3, page: 2 })

      expect(page1.data.length).toBe(3)
      expect(page2.data.length).toBe(3)
      expect(page1.data[0].id).not.toBe(page2.data[0].id)
      expect(page1.meta.page).toBe(1)
      expect(page2.meta.page).toBe(2)
      expect(page1.meta.totalPages).toBeGreaterThanOrEqual(2)
    })
  })

  describe("Detail and Entity Lookups", () => {
    it("returns specific research by ID", () => {
      const item = getMockResearch("40000000-0000-0000-0000-000000000001")
      expect(item).not.toBeNull()
      expect(item?.title).toBe("Accessible Research Discovery")
      expect(item?.uploader).toBeDefined()
      expect(item?.authors?.length).toBe(2)
    })

    it("returns null for non-existent research ID", () => {
      const item = getMockResearch("non-existent-id")
      expect(item).toBeNull()
    })

    it("returns recent research list", () => {
      const recent = getMockRecentResearch(4)
      expect(recent.data.length).toBe(4)
      expect(recent.meta.total).toBeGreaterThanOrEqual(4)
    })

    it("returns categories with computed approved research counts", () => {
      const categories = getMockCategories()
      expect(categories.length).toBe(MOCK_CATEGORIES.length)
      const se = categories.find((c) => c.id === "10000000-0000-0000-0000-000000000001")
      expect(se?.researchCount).toBeGreaterThan(0)
    })

    it("returns a specific category with its research papers", () => {
      const category = getMockCategory("10000000-0000-0000-0000-000000000001")
      expect(category).not.toBeNull()
      expect(category?.data.name).toBe("Software Engineering")
      expect(category?.data.researches?.length).toBeGreaterThan(0)
    })

    it("returns authors with computed paper counts and supports search", () => {
      const authors = getMockAuthors({ search: "Ada" })
      expect(authors.data.length).toBe(1)
      expect(authors.data[0].name).toBe("Ada Lovelace")
      expect(authors.data[0].paperCount).toBeGreaterThan(0)
    })

    it("returns author details and their papers", () => {
      const author = getMockAuthor("30000000-0000-0000-0000-000000000001")
      expect(author).not.toBeNull()
      expect(author?.name).toBe("Ada Lovelace")

      const papers = getMockAuthorPapers("30000000-0000-0000-0000-000000000001")
      expect(papers.data.length).toBeGreaterThan(0)
    })

    it("returns keywords list", () => {
      const keywords = getMockKeywords()
      expect(keywords.length).toBe(MOCK_KEYWORDS.length)
      expect(keywords.some((k) => k.name === "Accessibility")).toBe(true)
    })

    it("generates search suggestions for query", () => {
      const suggestions = getMockSuggestions("Ada")
      expect(suggestions.authors.some((a) => a.name.includes("Ada"))).toBe(true)
      expect(suggestions.researches.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Dashboard and Administrative Mock Data", () => {
    it("generates personal dashboard metrics with 30-day pulse", () => {
      const dashboard = getMockDashboard("personal", 30)
      expect(dashboard.scope).toBe("personal")
      expect(dashboard.mode).toBe("owner")
      expect(dashboard.isAdmin).toBe(false)
      expect(dashboard.cards.researchViews).toBeGreaterThan(0)
      expect(dashboard.pulse?.days.length).toBe(30)
      expect(dashboard.pulse?.current.researchViews).toBeGreaterThan(0)
      expect(dashboard.pulse?.previous.researchViews).toBeGreaterThan(0)
      expect(dashboard.docket.length).toBeGreaterThan(0)
      expect(dashboard.recentActivity.length).toBeGreaterThan(0)
      expect(dashboard.comparisons.length).toBeGreaterThan(0)
    })

    it("generates admin dashboard metrics with 90-day pulse and audit logs", () => {
      const dashboard = getMockDashboard("admin", 90)
      expect(dashboard.scope).toBe("admin")
      expect(dashboard.mode).toBe("admin")
      expect(dashboard.isAdmin).toBe(true)
      expect(dashboard.cards.approvedResearch).toBeGreaterThan(0)
      expect(dashboard.pulse?.days.length).toBe(90)
      expect(dashboard.recentAudit.length).toBeGreaterThan(0)
    })

    it("returns PDF access dashboard with mine, pending, and grants queues", () => {
      const pdfDashboard = getMockPdfAccessDashboard()
      expect(pdfDashboard.mine.length).toBeGreaterThan(0)
      expect(pdfDashboard.pending.length).toBeGreaterThan(0)
      expect(pdfDashboard.grants.length).toBeGreaterThan(0)
    })

    it("returns notifications list", () => {
      const notifs = getMockNotifications()
      expect(notifs.length).toBeGreaterThan(0)
      expect(notifs[0]).toHaveProperty("message")
    })
  })
})
