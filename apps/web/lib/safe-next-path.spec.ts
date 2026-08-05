import { describe, expect, it } from "vitest"

import { safeNextPath } from "./safe-next-path"

describe("safeNextPath", () => {
  it("accepts local paths and rejects external or protocol-relative redirects", () => {
    expect(safeNextPath("/research/1", "/dashboard")).toBe("/research/1")
    expect(safeNextPath("//example.com", "/dashboard")).toBe("/dashboard")
    expect(safeNextPath("https://example.com", "/dashboard")).toBe("/dashboard")
  })
})
