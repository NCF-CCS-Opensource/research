import { execFileSync } from "node:child_process"
import { createClient } from "@supabase/supabase-js"
import { beforeAll, describe, expect, it } from "vitest"

type LocalStatus = {
  API_URL: string
  PUBLISHABLE_KEY: string
  SECRET_KEY: string
}

let status: LocalStatus

beforeAll(() => {
  status = JSON.parse(
    execFileSync("./node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
    })
  ) as LocalStatus
})

describe("Supabase Auth Boundary", () => {
  it("creates safe profiles and applies current role and account status", async () => {
    const admin = createClient(status.API_URL, status.SECRET_KEY)
    const suffix = Date.now()
    const userEmail = `user-${suffix}@example.com`
    const adminEmail = `admin-${suffix}@example.com`

    const createdUser = await admin.auth.admin.createUser({
      email: userEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: {
        first_name: "Normal",
        last_name: "User",
        role: "admin",
      },
    })
    const createdAdmin = await admin.auth.admin.createUser({
      email: adminEmail,
      password: "password123",
      email_confirm: true,
      user_metadata: { first_name: "Trusted", last_name: "Admin" },
    })
    expect(createdUser.error).toBeNull()
    expect(createdAdmin.error).toBeNull()

    const userId = createdUser.data.user!.id
    const adminId = createdAdmin.data.user!.id
    const user = createClient(status.API_URL, status.PUBLISHABLE_KEY)
    const trusted = createClient(status.API_URL, status.PUBLISHABLE_KEY)
    await user.auth.signInWithPassword({
      email: userEmail,
      password: "password123",
    })
    await trusted.auth.signInWithPassword({
      email: adminEmail,
      password: "password123",
    })

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

    const bootstrap = await admin.rpc("bootstrap_first_admin", {
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
