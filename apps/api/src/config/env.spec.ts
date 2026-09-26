import { describe, expect, it } from "vitest"
import { validateEnv } from "./env"

describe("validateEnv", () => {
  it("returns parsed environment when valid", () => {
    const env = validateEnv({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/research",
      PORT: "3001",
      NODE_ENV: "test",
      CLERK_SECRET_KEY: "sk_test_secret",
    })
    expect(env.DATABASE_URL).toBe(
      "postgresql://postgres:postgres@localhost:5432/research"
    )
    expect(env.PORT).toBe(3001)
    expect(env.NODE_ENV).toBe("test")
  })

  it("throws when DATABASE_URL is missing", () => {
    expect(() =>
      validateEnv({
        PORT: "3001",
        CLERK_SECRET_KEY: "sk_test_secret",
      })
    ).toThrowError(/DATABASE_URL is required/)
  })

  it("throws when CLERK_SECRET_KEY is missing", () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/research",
      })
    ).toThrowError(/CLERK_SECRET_KEY is required/)
  })

  it("applies defaults for optional values", () => {
    const env = validateEnv({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/research",
      CLERK_SECRET_KEY: "sk_test_secret",
    })
    expect(env.PORT).toBe(3001)
    expect(env.NODE_ENV).toBe("development")
    expect(env.WEB_ORIGIN).toBe("http://localhost:3000")
  })
})
