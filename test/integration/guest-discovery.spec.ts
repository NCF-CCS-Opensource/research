import { execFileSync } from "node:child_process"
import { beforeAll, describe, expect, it } from "vitest"

beforeAll(() => {
  const status = JSON.parse(
    execFileSync("./node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
    })
  ) as { API_URL: string; PUBLISHABLE_KEY: string }
  process.env.NEXT_PUBLIC_SUPABASE_URL = status.API_URL
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = status.PUBLISHABLE_KEY
})

describe("Guest discovery against local Supabase", () => {
  it("browses approved Research Records without discovering pending or rejected records", async () => {
    const {
      getAuthorPapers,
      getAuthors,
      getCategories,
      getCategory,
      getResearch,
      searchResearch,
    } = await import("@/lib/api")
    const { getSupabase } = await import("@/lib/supabase")

    const search = await searchResearch({ q: "Ada", page: 1, limit: 10 })
    expect(search.data.map((research) => research.title)).toEqual([
      "Accessible Research Discovery",
    ])
    expect(
      await getResearch("40000000-0000-0000-0000-000000000001")
    ).toMatchObject({
      title: "Accessible Research Discovery",
    })
    await expect(
      getResearch("40000000-0000-0000-0000-000000000003")
    ).rejects.toMatchObject({
      status: 404,
    })
    await expect(
      getResearch("40000000-0000-0000-0000-000000000004")
    ).rejects.toMatchObject({
      status: 404,
    })
    const hidden = await getSupabase()
      .from("researches")
      .select("id")
      .in("status", ["pending", "rejected"])
    expect(hidden.error).toBeNull()
    expect(hidden.data).toEqual([])

    const firstPage = await searchResearch({
      q: "Grace Hopper",
      page: 1,
      limit: 1,
      sort: "date",
    })
    const secondPage = await searchResearch({
      q: "Grace Hopper",
      page: 2,
      limit: 1,
      sort: "date",
    })
    const emptyPage = await searchResearch({
      q: "Grace Hopper",
      page: 3,
      limit: 1,
      sort: "date",
    })
    expect(firstPage.meta).toEqual({ total: 2, page: 1, totalPages: 2 })
    expect(secondPage.meta).toEqual({ total: 2, page: 2, totalPages: 2 })
    expect(secondPage.data[0].id).not.toBe(firstPage.data[0].id)
    expect(emptyPage).toEqual({
      data: [],
      meta: { total: 2, page: 3, totalPages: 2 },
    })

    const authors = await getAuthors({ page: 1, limit: 20 })
    expect(authors.data.map((author) => author.name)).toEqual(
      expect.arrayContaining(["Ada Lovelace", "Grace Hopper"])
    )
    expect(
      (await getAuthorPapers("30000000-0000-0000-0000-000000000001")).meta.total
    ).toBe(1)

    const categories = await getCategories()
    expect(categories.map((category) => category.name)).toContain(
      "Software Engineering"
    )
    expect(
      (await getCategory("10000000-0000-0000-0000-000000000001")).meta.total
    ).toBe(1)
  })
})
