import { execFileSync } from "node:child_process"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

let status: { API_URL: string; PUBLISHABLE_KEY: string; SECRET_KEY: string }
let service: SupabaseClient
let admin: SupabaseClient
let owner: SupabaseClient
let reader: SupabaseClient
let adminId: string
let ownerId: string

async function user(label: string) {
  const email = `${label}-${Date.now()}-${crypto.randomUUID()}@example.com`
  const created = await service.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: { first_name: label, last_name: "Tester" },
  })
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY)
  await client.auth.signInWithPassword({ email, password: "password123" })
  return { client, email, id: created.data.user!.id }
}

async function research(
  client: SupabaseClient,
  id: string,
  title: string,
  complete = true
) {
  const created = await client.rpc("create_research_record", {
    research_title: title,
    research_abstract: "Integration test",
    research_publish_date: null,
    research_authors: [{ name: "Test Author" }],
    category_ids: [],
    keyword_ids: [],
  })
  expect(created.error).toBeNull()
  if (complete) {
    const staged = await service
      .from("researches")
      .update({
        pending_file_key: `pdfs/${created.data}/paper.pdf`,
        pending_file_name: "paper.pdf",
      })
      .eq("id", created.data)
    expect(staged.error).toBeNull()
    const confirmed = await service.rpc("confirm_research_upload", {
      target_id: created.data,
      owner_id: id,
    })
    expect(confirmed.error).toBeNull()
  }
  return created.data as string
}

beforeAll(async () => {
  status = JSON.parse(
    execFileSync("./node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
    })
  )
  service = createClient(status.API_URL, status.SECRET_KEY)
  const trusted = await user("admin")
  const uploader = await user("owner")
  const collector = await user("reader")
  admin = trusted.client
  owner = uploader.client
  reader = collector.client
  adminId = trusted.id
  ownerId = uploader.id
  await service.from("profiles").update({ role: "admin" }).eq("id", trusted.id)
})

afterAll(async () => {
  await service.from("profiles").update({ role: "user" }).eq("id", adminId)
})

describe("moderation and administration", () => {
  it("moderates atomically while keeping admin operations privileged", async () => {
    const approvedId = await research(owner, ownerId, "Moderate me")
    const denied = await reader.rpc("moderate_research", {
      target_id: approvedId,
      decision: "approved",
    })
    expect(denied.error).not.toBeNull()
    expect(
      (
        await reader.functions.invoke("r2", {
          body: { action: "moderation-download", researchId: approvedId },
        })
      ).error
    ).not.toBeNull()

    const approved = await admin.rpc("moderate_research", {
      target_id: approvedId,
      decision: "approved",
    })
    expect(approved.error).toBeNull()
    const guest = createClient(status.API_URL, status.PUBLISHABLE_KEY)
    const publicRead = await guest
      .from("public_research")
      .select("id")
      .eq("id", approvedId)
    expect(publicRead.data).toEqual([{ id: approvedId }])

    const rejectedId = await research(owner, ownerId, "Reject me")
    const rejected = await admin.rpc("moderate_research", {
      target_id: rejectedId,
      decision: "rejected",
      reason: "Needs revision",
    })
    expect(rejected.error).toBeNull()
    expect(
      (await owner.rpc("resubmit_research", { target_id: rejectedId })).error
    ).toBeNull()
    expect(
      (await guest.from("public_research").select("id").eq("id", rejectedId))
        .data
    ).toEqual([])

    const logs = await admin
      .from("audit_logs")
      .select("admin_id,research_id,action")
    expect(logs.data).toEqual(
      expect.arrayContaining([
        { admin_id: adminId, research_id: approvedId, action: "approve" },
        { admin_id: adminId, research_id: rejectedId, action: "reject" },
      ])
    )
    expect((await reader.from("audit_logs").select("id")).data).toEqual([])

    expect(
      (await reader.from("categories").insert({ name: "Denied" })).error
    ).not.toBeNull()
    expect(
      (await admin.from("categories").insert({ name: "Admin Category" })).error
    ).toBeNull()
    const institution = await admin
      .from("institutions")
      .insert({ name: `Admin Institution ${Date.now()}` })
      .select("id")
      .single()
    const program = await admin
      .from("programs")
      .insert({
        name: `Admin Program ${Date.now()}`,
        institution_id: institution.data!.id,
      })
      .select("institution_id")
      .single()
    expect(program.data?.institution_id).toBe(institution.data!.id)
    expect(
      (
        await reader.from("programs").insert({
          name: "Denied Program",
          institution_id: institution.data!.id,
        })
      ).error
    ).not.toBeNull()
    expect((await reader.from("profiles").select("id")).data).toEqual([
      expect.objectContaining({ id: expect.any(String) }),
    ])
    expect(
      (await admin.from("profiles").select("id")).data!.length
    ).toBeGreaterThanOrEqual(3)
  })
})

describe("collections", () => {
  it("only saves approved completed Research Records for their owner", async () => {
    const approvedId = await research(owner, ownerId, "Collect me")
    await admin.rpc("moderate_research", {
      target_id: approvedId,
      decision: "approved",
    })
    const readerId = (await reader.auth.getUser()).data.user!.id

    const saved = { user_id: readerId, research_id: approvedId }
    expect(
      (
        await reader.from("collections").upsert(saved, {
          onConflict: "user_id,research_id",
          ignoreDuplicates: true,
        })
      ).error
    ).toBeNull()
    expect(
      (
        await reader.from("collections").upsert(saved, {
          onConflict: "user_id,research_id",
          ignoreDuplicates: true,
        })
      ).error
    ).toBeNull()
    expect(
      (await owner.from("collections").select("research_id")).data
    ).toEqual([])

    const pendingId = await research(owner, ownerId, "Not collectable", false)
    expect(
      (
        await reader
          .from("collections")
          .insert({ user_id: readerId, research_id: pendingId })
      ).error
    ).not.toBeNull()
    expect(
      (await reader.from("collections").delete().eq("research_id", approvedId))
        .error
    ).toBeNull()
    expect(
      (await reader.from("collections").select("research_id")).data
    ).toEqual([])
  })
})
