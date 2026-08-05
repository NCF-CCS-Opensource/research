import { describe, expect, it } from "vitest"

import { countsDownloadEngagement } from "../../../supabase/functions/_shared/engagement"

describe("download engagement policy", () => {
  it("counts only granted Reader downloads", () => {
    expect(countsDownloadEngagement("granted-download")).toBe(true)
    expect(countsDownloadEngagement("owner-download")).toBe(false)
    expect(countsDownloadEngagement("moderation-download")).toBe(false)
  })
})
