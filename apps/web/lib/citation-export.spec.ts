import { describe, expect, it, vi } from "vitest"

import { trackSuccessfulCitationExport } from "@/lib/citation-export"

describe("trackSuccessfulCitationExport", () => {
  it.each(["copy", "BibTeX download"])(
    "does not record a failed %s",
    async () => {
      const record = vi.fn()

      await expect(
        trackSuccessfulCitationExport(
          () => Promise.reject(new Error("Export failed")),
          record
        )
      ).rejects.toThrow("Export failed")
      expect(record).not.toHaveBeenCalled()
    }
  )

  it("keeps a completed export successful when analytics fail", async () => {
    await expect(
      trackSuccessfulCitationExport(
        () => {},
        () => Promise.reject(new Error("Analytics failed"))
      )
    ).resolves.toBe(false)
  })
})
