import { describe, expect, it } from "vitest"
import type { Database } from "../../database/database"
import { PaperUseCases, StalePaperEditError } from "./paper.use-cases"

describe("PaperUseCases", () => {
  const useCases = new PaperUseCases(undefined as unknown as Database)

  it("hides another account's Paper list from non-Students", async () => {
    await expect(
      useCases.listMine({
        state: "active",
        profileId: "10000000-0000-0000-0000-000000000001",
        clerkUserId: "user_1",
        email: "coordinator@ncf.edu.ph",
        role: "coordinator",
      })
    ).rejects.toMatchObject({ status: 404 })
  })

  it("reports stale lock-version edits as conflicts", () => {
    expect(new StalePaperEditError().status).toBe(409)
  })
})
