import { verifyToken } from "@clerk/backend"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ClerkTokenVerifier } from "./clerk-token-verifier"

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
}))

const mockVerifyToken = vi.mocked(verifyToken)

type VerifiedPayload = Awaited<ReturnType<typeof verifyToken>>

describe("ClerkTokenVerifier", () => {
  beforeEach(() => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:postgres@localhost:5432/research"
    )
    vi.stubEnv("CLERK_SECRET_KEY", "test-clerk-secret")
    vi.stubEnv("WEB_ORIGIN", "https://app.example.test")
    mockVerifyToken.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("verifies against Clerk's signing keys, scoped to the web app's origin", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: "clerk_user_1",
      email: "person@ncf.edu.ph",
    } as VerifiedPayload)

    const identity = await new ClerkTokenVerifier().verify("a-token")

    expect(mockVerifyToken).toHaveBeenCalledWith("a-token", {
      secretKey: "test-clerk-secret",
      authorizedParties: ["https://app.example.test"],
    })
    expect(identity).toEqual({
      clerkUserId: "clerk_user_1",
      email: "person@ncf.edu.ph",
    })
  })

  it("returns null when the token has no email claim", async () => {
    mockVerifyToken.mockResolvedValue({
      sub: "clerk_user_1",
    } as VerifiedPayload)

    const identity = await new ClerkTokenVerifier().verify("a-token")

    expect(identity).toBeNull()
  })

  it("returns null when Clerk rejects the token", async () => {
    mockVerifyToken.mockRejectedValue(new Error("invalid signature"))

    const identity = await new ClerkTokenVerifier().verify("bad-token")

    expect(identity).toBeNull()
  })
})
