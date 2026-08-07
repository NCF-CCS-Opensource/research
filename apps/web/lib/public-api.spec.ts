import { beforeEach, describe, expect, it, vi } from "vitest"

describe("API client", () => {
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
              citation_export_count: 2,
              authors: [{ id: "author-1", name: "Ada Lovelace" }],
              categories: [{ id: "category-1", name: "Computing" }],
            },
          ]),
          { status: 200, headers: { "content-range": "0-0/1" } }
        )
      )
    )

    const { discovery } = await import("./web-transport")
    const result = await discovery.getRecentResearch(6)

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: "approved-research",
          publishDate: "2026-01-02",
          createdAt: "2026-01-03T00:00:00Z",
          viewCount: 7,
          citationExportCount: 2,
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

  it("emails the owner after a successful moderation decision", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Email sent" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    vi.stubGlobal("fetch", fetchMock)

    const { researchLifecycle } = await import("./web-transport")
    await researchLifecycle.moderate("research-1", "rejected", "Needs revision")

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/rest/v1/rpc/moderate_research"
    )
    expect(String(fetchMock.mock.calls[1][0])).toContain("/functions/v1/r2")
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      action: "email-research-moderation",
      researchId: "research-1",
    })
  })

  it.each([
    [
      "P0001",
      "At least one Author is required",
      "At least one Author is required",
      400,
    ],
    [
      "42501",
      "Owners cannot request their own PDF",
      "Owners cannot request their own PDF",
      403,
    ],
    [
      "PGRST116",
      "JSON object requested, multiple (or no) rows returned",
      "That record isn't available.",
      404,
    ],
    [
      "23505",
      'duplicate key value violates unique constraint "categories_name_key"',
      "That name is already taken.",
      500,
    ],
    [
      "23503",
      'update or delete violates foreign key constraint "programs_institution_id_fkey"',
      "Something still refers to this; remove those first.",
      500,
    ],
  ])(
    "shows safe database text for %s",
    async (code, platformMessage, expectedMessage, status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ code, message: platformMessage }, { status: 400 })
          )
      )

      const { discovery } = await import("./web-transport")

      await expect(
        discovery.getResearch("research-1")
      ).rejects.toMatchObject({
        message: expectedMessage,
        status,
      })
    }
  )

  it("hides untranslated database text and retains it as the cause", async () => {
    const platformMessage = 'relation "private_table" does not exist'
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: "42P01", message: platformMessage },
            { status: 500 }
          )
        )
    )

    const { discovery } = await import("./web-transport")

    await expect(
      discovery.getResearch("research-1")
    ).rejects.toMatchObject({
      message: "Something went wrong. Please try again.",
      cause: expect.objectContaining({ message: platformMessage }),
    })
  })

  it("shows the R2 Edge Function's authored failure message and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "Only PDF files are accepted" },
            { status: 400 }
          )
        )
    )

    const { pdfAccess } = await import("./web-transport")

    await expect(
      pdfAccess.getOwnerDownloadUrl("research-1")
    ).rejects.toMatchObject({
      message: "Only PDF files are accepted",
      status: 400,
    })
  })

  it("falls back when an R2 failure body is unreadable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not json", { status: 500 }))
    )

    const { pdfAccess } = await import("./web-transport")

    await expect(
      pdfAccess.getOwnerDownloadUrl("research-1")
    ).rejects.toMatchObject({
      message: "Something went wrong. Please try again.",
      cause: expect.any(Error),
    })
  })

  it("falls back when R2 has no response context", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network down")))

    const { pdfAccess } = await import("./web-transport")

    await expect(
      pdfAccess.getOwnerDownloadUrl("research-1")
    ).rejects.toMatchObject({
      message: "Something went wrong. Please try again.",
      status: 500,
      cause: expect.any(Error),
    })
  })
})
