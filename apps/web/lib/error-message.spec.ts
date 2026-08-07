import { describe, expect, it } from "vitest"

import { errorMessage } from "./error-message"

describe("errorMessage", () => {
  it("keeps Error messages", () => {
    expect(errorMessage(new Error("Authored message"), "Fallback")).toBe(
      "Authored message"
    )
  })

  it("uses the written fallback for other rejection values", () => {
    expect(errorMessage("failed", "Fallback")).toBe("Fallback")
  })
})
