import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const exchangeCodeForSession = vi.fn()
const verifyOtp = vi.fn()

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabase: async () => ({
    auth: {
      exchangeCodeForSession,
      verifyOtp,
    },
  }),
}))

import { GET } from "./route"

describe("email confirmation callback", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    verifyOtp.mockReset()
  })

  it("exchanges a Registration PKCE code and opens the dashboard", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { redirectType: null },
      error: null,
    })

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/confirm?code=pkce-code&flow=recovery&next=/upload"
      )
    )

    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code")
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    )
  })

  it("verifies a signup token and opens the dashboard", async () => {
    verifyOtp.mockResolvedValue({ error: null })

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/confirm?token_hash=signup-token&type=signup&next=/admin"
      )
    )

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "signup-token",
      type: "signup",
    })
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    )
  })

  it("retains the password-recovery destination", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { redirectType: "recovery" },
      error: null,
    })

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/auth/confirm?code=recovery-code&next=/reset-password"
      )
    )

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password"
    )
  })
})
