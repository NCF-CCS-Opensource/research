import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.fn(
  (
    _url: string,
    _key: string,
    _options: { accessToken: () => Promise<string | null> }
  ) => ({ from: vi.fn(), url: _url, key: _key, options: _options })
)

vi.mock("@supabase/supabase-js", () => ({ createClient }))

describe("Supabase Data API session", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key"
  })

  it("uses the current Clerk session token", async () => {
    const getToken = vi.fn().mockResolvedValue("clerk-session-token")
    vi.stubGlobal("window", { Clerk: { session: { getToken } } })
    const { getSupabase } = await import("./supabase")

    getSupabase()
    const options = createClient.mock.calls[0]?.[2]

    await expect(options?.accessToken()).resolves.toBe("clerk-session-token")
    expect(getToken).toHaveBeenCalledOnce()
  })
})
