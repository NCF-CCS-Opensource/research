import { describe, expect, it } from "vitest"

import { chartPoints, comparisonLabel } from "@/lib/dashboard"

describe("dashboard presentation", () => {
  it("labels zero baselines honestly and plots bounded chart points", () => {
    expect(comparisonLabel(3, 0, 30)).toBe("New activity")
    expect(comparisonLabel(0, 0, 90)).toBe("No activity")
    expect(comparisonLabel(15, 10, 30)).toBe("+50% vs prior 30 days")
    expect(
      chartPoints(
        [
          {
            date: "2026-07-28",
            researchViews: 0,
            authorizedDownloads: 0,
            citationExports: 0,
          },
          {
            date: "2026-07-29",
            researchViews: 4,
            authorizedDownloads: 0,
            citationExports: 0,
          },
        ],
        "researchViews",
        100,
        50
      )
    ).toBe("0,50 100,0")
  })
})
