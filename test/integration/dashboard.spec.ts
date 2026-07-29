import { execFileSync } from "node:child_process"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

let status: { API_URL: string; PUBLISHABLE_KEY: string; SECRET_KEY: string }
let service: SupabaseClient
let owner: SupabaseClient
let reader: SupabaseClient
let admin: SupabaseClient
let outsider: SupabaseClient
let ownerId: string
let readerId: string
let adminId: string
let outsiderId: string

async function user(label: string) {
  const email = `${label}-${Date.now()}-${crypto.randomUUID()}@example.com`
  const created = await service.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: { first_name: label, last_name: "Dashboard" },
  })
  const client = createClient(status.API_URL, status.PUBLISHABLE_KEY)
  await client.auth.signInWithPassword({ email, password: "password123" })
  return { client, id: created.data.user!.id }
}

async function research(
  client: SupabaseClient,
  owner: string,
  title: string,
  options: {
    upload?: boolean
    status?: "pending" | "approved" | "rejected"
    createdAt?: string
  } = {}
) {
  const created = await client.rpc("create_research_record", {
    research_title: title,
    research_abstract: "Dashboard integration test",
    research_publish_date: null,
    research_authors: [{ name: `${title} Author` }],
    category_ids: [],
    keyword_ids: [],
  })
  expect(created.error).toBeNull()
  const id = created.data as string

  if (options.upload) {
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
          owner_id: owner,
        })
      ).error
    ).toBeNull()
  }

  await service
    .from("researches")
    .update({
      status: options.status ?? "pending",
      created_at: options.createdAt,
      rejection_reason:
        options.status === "rejected" ? "Revise the methodology" : null,
    })
    .eq("id", id)
  return id
}

beforeAll(async () => {
  status = JSON.parse(
    execFileSync("./node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
    })
  )
  service = createClient(status.API_URL, status.SECRET_KEY)
  const users = await Promise.all([
    user("Owner"),
    user("Reader"),
    user("Admin"),
    user("Outsider"),
  ])
  ;[
    { client: owner, id: ownerId },
    { client: reader, id: readerId },
    { client: admin, id: adminId },
    { client: outsider, id: outsiderId },
  ] = users

  await service.from("profiles").update({ role: "admin" }).eq("id", adminId)
  await service
    .from("profiles")
    .update({ institution_id: "50000000-0000-0000-0000-000000000001" })
    .in("id", [readerId, outsiderId])
})

afterAll(async () => {
  await service.from("profiles").update({ role: "user" }).eq("id", adminId)
})

describe("personal dashboard", () => {
  it("returns isolated Reader cards and activity, then adapts to Owner", async () => {
    const approved = await research(owner, ownerId, "Reader activity", {
      upload: true,
      status: "approved",
    })
    await reader.from("collections").insert({
      user_id: readerId,
      research_id: approved,
    })
    const request = await reader.rpc("create_pdf_request", {
      target_research_id: approved,
      note: "Reader dashboard request",
    })
    expect(request.error).toBeNull()

    const initial = await reader.rpc("get_dashboard", {
      requested_scope: "personal",
      requested_period: 30,
    })
    expect(initial.error).toBeNull()
    expect(initial.data).toMatchObject({
      scope: "personal",
      mode: "reader",
      isAdmin: false,
      cards: {
        savedResearch: 1,
        pendingPdfRequests: 1,
        grantedResearchPdfs: 0,
      },
    })
    expect(initial.data.cards.unreadNotifications).toBe(0)
    expect(initial.data.recentActivity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Reader activity",
          href: "/dashboard/collections",
        }),
        expect.objectContaining({
          title: "Reader activity",
          href: "/dashboard/pdf-requests",
        }),
      ])
    )
    expect(initial.data.pulse).toBeNull()

    await research(reader, readerId, "First owned record")
    const adapted = await reader.rpc("get_dashboard", {
      requested_scope: "personal",
      requested_period: 30,
    })
    expect(adapted.data).toMatchObject({
      mode: "owner",
      cards: { ownedResearch: 1 },
    })
    expect(
      adapted.data.docket.find(
        (item: { kind: string }) => item.kind === "incomplete_uploads"
      )
    ).toMatchObject({
      count: 1,
      href: "/dashboard/papers",
    })
  })

  it("returns private Owner pulse, docket, and raw Research comparison", async () => {
    const pulseRecord = await research(owner, ownerId, "Pulse record", {
      upload: true,
      status: "approved",
    })
    const rejected = await research(owner, ownerId, "Needs revision", {
      upload: true,
      status: "rejected",
    })
    await outsider.rpc("create_pdf_request", {
      target_research_id: pulseRecord,
      note: "Pending owner action",
    })

    const today = new Date()
    const prior = new Date(today)
    const current90 = new Date(today)
    const previous90 = new Date(today)
    prior.setUTCDate(prior.getUTCDate() - 30)
    current90.setUTCDate(current90.getUTCDate() - 60)
    previous90.setUTCDate(previous90.getUTCDate() - 91)
    await service.from("engagement_daily").upsert([
      {
        research_id: pulseRecord,
        day: today.toISOString().slice(0, 10),
        view_count: 5,
        download_count: 2,
        citation_export_count: 1,
      },
      {
        research_id: pulseRecord,
        day: prior.toISOString().slice(0, 10),
        view_count: 2,
        download_count: 0,
        citation_export_count: 0,
      },
      {
        research_id: pulseRecord,
        day: current90.toISOString().slice(0, 10),
        view_count: 3,
        download_count: 0,
        citation_export_count: 0,
      },
      {
        research_id: pulseRecord,
        day: previous90.toISOString().slice(0, 10),
        view_count: 4,
        download_count: 0,
        citation_export_count: 0,
      },
    ])

    const result = await owner.rpc("get_dashboard", {
      requested_scope: "personal",
      requested_period: 30,
    })
    expect(result.error).toBeNull()
    expect(result.data.pulse).toMatchObject({
      period: 30,
      current: {
        researchViews: 5,
        authorizedDownloads: 2,
        citationExports: 1,
      },
      previous: {
        researchViews: 2,
        authorizedDownloads: 0,
        citationExports: 0,
      },
      earliestAvailableDate: previous90.toISOString().slice(0, 10),
    })
    expect(result.data.comparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: pulseRecord,
          title: "Pulse record",
          pendingRequests: 1,
        }),
        expect.objectContaining({
          id: rejected,
          title: "Needs revision",
        }),
      ])
    )
    expect(
      result.data.comparisons.some(
        (item: { title: string }) => item.title === "First owned record"
      )
    ).toBe(false)
    expect(
      result.data.docket.find(
        (item: { kind: string }) => item.kind === "rejected_records"
      ).count
    ).toBeGreaterThanOrEqual(1)
    expect(
      result.data.docket.find(
        (item: { kind: string }) => item.kind === "pending_pdf_requests"
      ).count
    ).toBeGreaterThanOrEqual(1)

    const expanded = await owner.rpc("get_dashboard", {
      requested_scope: "personal",
      requested_period: 90,
    })
    expect(expanded.data.pulse).toMatchObject({
      period: 90,
      current: { researchViews: 10 },
      previous: { researchViews: 4 },
    })
  })
})

describe("Admin dashboard", () => {
  it("rejects non-Admins and returns operational aggregate-only data", async () => {
    expect(
      (
        await reader.rpc("get_dashboard", {
          requested_scope: "admin",
          requested_period: 30,
        })
      ).error
    ).not.toBeNull()

    const older = await research(owner, ownerId, "Oldest moderation item", {
      upload: true,
      createdAt: "2026-01-01T00:00:00Z",
    })
    await research(owner, ownerId, "Newer moderation item", {
      upload: true,
      createdAt: "2026-02-01T00:00:00Z",
    })
    await research(owner, ownerId, "Incomplete owner work")

    const result = await admin.rpc("get_dashboard", {
      requested_scope: "admin",
      requested_period: 90,
    })
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      scope: "admin",
      mode: "admin",
      isAdmin: true,
      cards: {
        readyForModeration: expect.any(Number),
        activeAccounts: expect.any(Number),
        approvedResearch: expect.any(Number),
        pdfAccessRequestsLast30Days: expect.any(Number),
      },
      pulse: { period: 90 },
    })
    expect(result.data.docket[0].id).toBe(older)
    expect(
      result.data.docket.some(
        (item: { title: string }) => item.title === "Incomplete owner work"
      )
    ).toBe(false)
    expect(result.data.cards).not.toHaveProperty("requestId")
    expect(result.data.cards).not.toHaveProperty("requestNote")
    expect(result.data).not.toHaveProperty("pdfRequests")

    const personal = await admin.rpc("get_dashboard", {
      requested_scope: "personal",
      requested_period: 30,
    })
    expect(personal.data).toMatchObject({
      scope: "personal",
      mode: "reader",
      isAdmin: true,
    })
  })

  it("accepts only supported Engagement Trend periods", async () => {
    expect(
      (
        await admin.rpc("get_dashboard", {
          requested_scope: "admin",
          requested_period: 7,
        })
      ).error
    ).not.toBeNull()
    expect(
      (
        await admin.rpc("get_dashboard", {
          requested_scope: "admin",
          requested_period: null as unknown as number,
        })
      ).error
    ).not.toBeNull()
  })
})
