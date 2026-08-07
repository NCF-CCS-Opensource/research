import { describe, expect, it } from "vitest"

import { onboardingProfile } from "./onboarding"

describe("onboarding Profile input", () => {
  it("uses trusted identity and ignores attempted role tampering", () => {
    const form = new FormData()
    Object.entries({
      id: "attacker",
      email: "attacker@example.com",
      role: "admin",
      firstName: " Ada ",
      lastName: " Lovelace ",
      customInstitution: " NCF ",
      customProgram: " BSCS ",
    }).forEach(([key, value]) => form.set(key, value))

    expect(
      onboardingProfile({ id: "user_1", email: "ada@example.com" }, form)
    ).toEqual({
      id: "user_1",
      email: "ada@example.com",
      first_name: "Ada",
      middle_name: null,
      last_name: "Lovelace",
      suffix: null,
      institution_id: null,
      custom_institution: "NCF",
      program_id: null,
      custom_program: "BSCS",
    })
  })

  it("rejects missing or conflicting Institution choices", () => {
    const form = new FormData()
    form.set("firstName", "Ada")
    form.set("lastName", "Lovelace")
    expect(
      onboardingProfile({ id: "user_1", email: "ada@example.com" }, form)
    ).toBe("Choose one Institution.")
    form.set("institutionId", "inst_1")
    form.set("customInstitution", "NCF")
    expect(
      onboardingProfile({ id: "user_1", email: "ada@example.com" }, form)
    ).toBe("Choose one Institution.")
  })
})
