import { execFileSync } from "node:child_process"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { beforeAll, describe, expect, it } from "vitest"

let status: { API_URL: string; PUBLISHABLE_KEY: string; SECRET_KEY: string }
let service: SupabaseClient
let owner: SupabaseClient
let requester: SupabaseClient
let outsider: SupabaseClient
let ownerId: string
let requesterId: string
let outsiderId: string
let institutionId: string

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
  return { client, id: created.data.user!.id }
}

async function approvedResearch(title: string) {
  const created = await owner.rpc("create_research_record", {
    research_title: title,
    research_abstract: "Integration test",
    research_publish_date: null,
    research_authors: [{ name: "Owner Author" }],
    category_ids: [],
    keyword_ids: [],
  })
  expect(created.error).toBeNull()
  const id = created.data as string
  await service
    .from("researches")
    .update({
      pending_file_key: `pdfs/${id}/paper.pdf`,
      pending_file_name: "paper.pdf",
    })
    .eq("id", id)
  expect(
    (
      await service.rpc("confirm_research_upload", {
        target_id: id,
        owner_id: ownerId,
      })
    ).error
  ).toBeNull()
  await service.from("researches").update({ status: "approved" }).eq("id", id)
  return id
}

beforeAll(async () => {
  status = JSON.parse(
    execFileSync("./node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
    })
  )
  service = createClient(status.API_URL, status.SECRET_KEY)
  const ownerUser = await user("Owner")
  const requesterUser = await user("Requester")
  const outsiderUser = await user("Outsider")
  owner = ownerUser.client
  requester = requesterUser.client
  outsider = outsiderUser.client
  ownerId = ownerUser.id
  requesterId = requesterUser.id
  outsiderId = outsiderUser.id
  const institution = await service
    .from("institutions")
    .insert({ name: `Institution ${Date.now()}` })
    .select("id")
    .single()
  expect(institution.error).toBeNull()
  institutionId = institution.data!.id
  await service
    .from("profiles")
    .update({ institution_id: institutionId })
    .eq("id", outsiderId)
})

describe("PDF Access lifecycle", () => {
  it("enforces identity, ownership, concurrency, grants, cooldown, and replacement", async () => {
    const researchId = await approvedResearch("Lifecycle")

    expect(
      (
        await owner.rpc("create_pdf_request", {
          target_research_id: researchId,
          note: "Own",
        })
      ).error
    ).not.toBeNull()
    expect(
      (
        await requester.rpc("create_pdf_request", {
          target_research_id: researchId,
          note: "Missing identity",
        })
      ).error
    ).not.toBeNull()
    await service
      .from("profiles")
      .update({ institution_id: institutionId })
      .eq("id", requesterId)
    const attempts = await Promise.all([
      requester.rpc("create_pdf_request", {
        target_research_id: researchId,
        note: "  Needed for class  ",
      }),
      requester.rpc("create_pdf_request", {
        target_research_id: researchId,
        note: "Duplicate",
      }),
    ])
    expect(attempts.filter(({ error }) => !error)).toHaveLength(1)
    const requestId = attempts.find(({ data }) => data)?.data as string
    expect(
      (
        await outsider.rpc("transition_pdf_request", {
          target_request_id: requestId,
          action: "approve",
        })
      ).error
    ).not.toBeNull()
    expect(
      (
        await owner.rpc("transition_pdf_request", {
          target_request_id: requestId,
          action: "approve",
        })
      ).data
    ).toBe("granted")

    const directBypass = await requester.rpc("authorize_granted_download", {
      target_request_id: requestId,
      requester: requesterId,
    })
    expect(directBypass.error).not.toBeNull()
    const authorized = await service.rpc("authorize_granted_download", {
      target_request_id: requestId,
      requester: requesterId,
    })
    expect(authorized.data).toEqual([
      { research_id: researchId, file_key: `pdfs/${researchId}/paper.pdf` },
    ])
    expect(
      (
        await owner.rpc("transition_pdf_request", {
          target_request_id: requestId,
          action: "revoke",
        })
      ).data
    ).toBe("revoked")
    expect(
      (
        await service.rpc("authorize_granted_download", {
          target_request_id: requestId,
          requester: requesterId,
        })
      ).data
    ).toEqual([])
    expect(
      (
        await requester.rpc("create_pdf_request", {
          target_research_id: researchId,
          note: "Too soon",
        })
      ).error
    ).not.toBeNull()

    const replaceId = await approvedResearch("Replacement")
    const pending = await outsider.rpc("create_pdf_request", {
      target_research_id: replaceId,
      note: "Pending",
    })
    const granted = await requester.rpc("create_pdf_request", {
      target_research_id: replaceId,
      note: "Grant",
    })
    await owner.rpc("transition_pdf_request", {
      target_request_id: granted.data,
      action: "approve",
    })
    await service
      .from("researches")
      .update({
        pending_file_key: `pdfs/${replaceId}/replacement.pdf`,
        pending_file_name: "replacement.pdf",
      })
      .eq("id", replaceId)
    expect(
      (
        await service.rpc("confirm_research_upload", {
          target_id: replaceId,
          owner_id: ownerId,
        })
      ).error
    ).toBeNull()

    const closed = await service
      .from("pdf_requests")
      .select("id,status")
      .in("id", [pending.data, granted.data])
    expect(closed.data).toEqual(
      expect.arrayContaining([
        { id: pending.data, status: "canceled" },
        { id: granted.data, status: "revoked" },
      ])
    )
    expect(
      (
        await service
          .from("notifications")
          .select("id")
          .eq("research_id", replaceId)
      ).data!.length
    ).toBeGreaterThanOrEqual(4)
    expect(
      (
        await service
          .from("researches")
          .select("status")
          .eq("id", replaceId)
          .single()
      ).data?.status
    ).toBe("pending")
  })
})

describe("Engagement Counts", () => {
  it("counts explicit public engagement and trusted granted downloads only", async () => {
    const researchId = await approvedResearch("Engagement")
    const guest = createClient(status.API_URL, status.PUBLISHABLE_KEY)
    await guest.rpc("record_engagement", {
      target_research_id: researchId,
      kind: "view",
    })
    await requester.rpc("record_engagement", {
      target_research_id: researchId,
      kind: "citation",
    })
    expect(
      (
        await guest
          .from("researches")
          .update({ view_count: 999 })
          .eq("id", researchId)
      ).error
    ).not.toBeNull()

    const requested = await requester.rpc("create_pdf_request", {
      target_research_id: researchId,
      note: "Download",
    })
    await owner.rpc("transition_pdf_request", {
      target_request_id: requested.data,
      action: "approve",
    })
    await service.rpc("authorize_granted_download", {
      target_request_id: requested.data,
      requester: requesterId,
    })
    const counts = await service
      .from("researches")
      .select("view_count,citation_count,download_count")
      .eq("id", researchId)
      .single()
    expect(counts.data).toEqual({
      view_count: 1,
      citation_count: 1,
      download_count: 1,
    })
    expect((await owner.rpc("get_engagement_overview")).data).toMatchObject({
      totalResearches: 3,
      totalViews: 1,
      totalDownloads: 2,
      totalCitations: 1,
    })
  })
})
