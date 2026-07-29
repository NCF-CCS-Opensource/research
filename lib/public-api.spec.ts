import { beforeEach, describe, expect, it, vi } from "vitest"

describe("Guest discovery", () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test"
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key"
  })

  it("returns paginated approved Research Records through the public facade", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "approved-research",
              title: "Approved Research",
              publish_date: "2026-01-02",
              created_at: "2026-01-03T00:00:00Z",
              view_count: 7,
              download_count: 3,
              citation_count: 2,
              authors: [{ id: "author-1", name: "Ada Lovelace" }],
              categories: [{ id: "category-1", name: "Computing" }],
            },
          ]),
          { status: 200, headers: { "content-range": "0-0/1" } }
        )
      )
    )

    const { getRecentResearch } = await import("./api")
    const result = await getRecentResearch(6)

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: "approved-research",
          publishDate: "2026-01-02",
          createdAt: "2026-01-03T00:00:00Z",
          viewCount: 7,
          authors: [{ id: "author-1", name: "Ada Lovelace" }],
        }),
      ],
      meta: { total: 1, page: 1, totalPages: 1 },
    })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/rest/v1/public_research"),
      expect.any(Object)
    )
  })
})
