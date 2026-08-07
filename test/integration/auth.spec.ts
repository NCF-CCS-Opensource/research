import { execFileSync } from "node:child_process"
import { createClient } from "@supabase/supabase-js"
import { beforeAll, describe, expect, it } from "vitest"
import { authenticatedClient, type LocalStatus } from "./user"

let status: LocalStatus

beforeAll(() => {
  status = JSON.parse(
    execFileSync("./node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
    })
  ) as LocalStatus
})

describe("Supabase Auth Boundary", () => {
  it("authenticates a verified user before Profile onboarding", async () => {
    const service = createClient(status.API_URL, status.SECRET_KEY)
    const email = `auth-${crypto.randomUUID()}@example.com`
    const created = await service.auth.admin.createUser({
      email,
      password: "password123",
      email_confirm: true,
    })
    expect(created.error).toBeNull()

    const browser = createClient(status.API_URL, status.PUBLISHABLE_KEY)
    const signedIn = await browser.auth.signInWithPassword({
      email,
      password: "password123",
    })
    expect(signedIn.data.user?.id).toBe(created.data.user?.id)
    expect(
      (await browser.rpc("get_current_profile_access").maybeSingle()).data
    ).toBeNull()

    await service.from("profiles").insert({
      id: created.data.user!.id,
      email,
      first_name: "New",
      last_name: "User",
      custom_institution: "Test Institution",
    })
    expect(
      (await browser.rpc("get_current_profile_access").single()).data
    ).toEqual({ role: "user", status: "active" })
  })

  it("authorizes a text identity subject through the shared database seam", async () => {
    const service = createClient(status.API_URL, status.SECRET_KEY)
    const id = `user_${crypto.randomUUID()}`
    const profile = await service.from("profiles").insert({
      id,
      email: `${id}@example.com`,
      first_name: "Supabase",
      last_name: "User",
    })
    expect(profile.error).toBeNull()

    const user = authenticatedClient(status, id)
    const ownProfile = await user.from("profiles").select("id").single()
    expect(ownProfile.data).toEqual({ id })

    const research = await user.rpc("create_research_record", {
      research_title: "Text-owned Research",
      research_abstract: "Authenticated identity",
      research_publish_date: null,
      research_authors: [{ name: "Text User" }],
      category_ids: [],
      keyword_ids: [],
    })
    expect(research.error).toBeNull()

    await service.from("profiles").update({ status: "suspended" }).eq("id", id)
    const suspendedAccess = await user.rpc("get_current_profile_access").single()
    expect(suspendedAccess.data).toEqual({ role: "user", status: "suspended" })
    const suspendedMutation = await user.rpc("create_research_record", {
      research_title: "Blocked Research",
      research_abstract: "A suspended User cannot create this",
      research_publish_date: null,
      research_authors: [{ name: "Blocked User" }],
      category_ids: [],
      keyword_ids: [],
    })
    expect(suspendedMutation.error).not.toBeNull()
  })

  it("bootstraps and applies current role and account status", async () => {
    const service = createClient(status.API_URL, status.SECRET_KEY)
    const userId = `user_${crypto.randomUUID()}`
    const adminId = `user_${crypto.randomUUID()}`
    const userEmail = `${userId}@example.com`
    const adminEmail = `${adminId}@example.com`
    const profiles = await service.from("profiles").insert([
      { id: userId, email: userEmail, first_name: "Normal", last_name: "User" },
      {
        id: adminId,
        email: adminEmail,
        first_name: "Trusted",
        last_name: "Admin",
        custom_institution: "Test Institution",
      },
    ])
    expect(profiles.error).toBeNull()

    const user = authenticatedClient(status, userId)
    const trusted = authenticatedClient(status, adminId)

    const ownProfile = await user
      .from("profiles")
      .select("id,role,status")
      .single()
    expect(ownProfile.data).toEqual({
      id: userId,
      role: "user",
      status: "active",
    })

    const escalation = await user
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userId)
    expect(escalation.error).not.toBeNull()

    const bootstrap = await service.rpc("bootstrap_first_admin", {
      target_email: adminEmail,
    })
    expect(bootstrap.error).toBeNull()
    const listed = await trusted.from("profiles").select("id")
    expect(listed.data?.map(({ id }) => id)).toEqual(
      expect.arrayContaining([userId, adminId])
    )

    const suspend = await trusted.rpc("admin_update_account", {
      target_id: userId,
      new_role: "user",
      new_status: "suspended",
    })
    expect(suspend.error).toBeNull()
    const suspended = await user.from("profiles").select("id")
    expect(suspended.data).toEqual([])
  })
})
