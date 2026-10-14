import { describe, expect, it } from "vitest"
import { paperDetailsSchema } from "./draft.contract"

const valid = {
  title: "A valid research title",
  abstract: "a".repeat(100),
  authors: [{ displayName: "Ada Lovelace", kind: "person" as const }],
  year: new Date().getFullYear(),
  researchType: "qualitative" as const,
  keywords: ["research", "systems", "design"],
  programId: "10000000-0000-0000-0000-000000000001",
}

describe("paperDetailsSchema", () => {
  it("accepts valid details and trims the title", () => {
    expect(
      paperDetailsSchema.parse({ ...valid, title: ` ${valid.title} ` }).title
    ).toBe(valid.title)
  })

  it("rejects duplicate keywords regardless of case", () => {
    expect(
      paperDetailsSchema.safeParse({
        ...valid,
        keywords: ["Research", "research", "systems"],
      }).success
    ).toBe(false)
  })

  it("rejects an abstract shorter than 100 characters", () => {
    expect(
      paperDetailsSchema.safeParse({ ...valid, abstract: "too short" }).success
    ).toBe(false)
  })
})
