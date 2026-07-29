import { execFileSync } from "node:child_process"
import { createClient } from "@supabase/supabase-js"
import { beforeAll, describe, expect, it } from "vitest"

let status: { API_URL: string; PUBLISHABLE_KEY: string; SECRET_KEY: string }

beforeAll(() => {
  status = JSON.parse(
    execFileSync("./node_modules/.bin/supabase", ["status", "-o", "json"], {
      encoding: "utf8",
    })
  )
})

describe("Owner Research Records", () => {
  it("keeps ownership private and reserves upload confirmation for the trusted boundary", async () => {
    const service = createClient(status.API_URL, status.SECRET_KEY)
    const suffix = Date.now()
    const ownerEmail = `owner-${suffix}@example.com`
    const otherEmail = `other-${suffix}@example.com`
    const ownerAuth = await service.auth.admin.createUser({
      email: ownerEmail,
      password: "password123",
      email_confirm: true,
    })
    await service.auth.admin.createUser({
      email: otherEmail,
      password: "password123",
      email_confirm: true,
    })

    const owner = createClient(status.API_URL, status.PUBLISHABLE_KEY)
    const other = createClient(status.API_URL, status.PUBLISHABLE_KEY)
    await owner.auth.signInWithPassword({
      email: ownerEmail,
      password: "password123",
    })
    await other.auth.signInWithPassword({
      email: otherEmail,
      password: "password123",
    })

    const created = await owner.rpc("create_research_record", {
      research_title: "Owner-only Draft",
      research_abstract: "Protected before Approval.",
      research_publish_date: "2026-07-29",
      research_authors: [{ name: "Owner Author" }],
      category_ids: [],
      keyword_ids: [],
    })
    expect(created.error).toBeNull()
    const researchId = created.data as string

    const ownerRead = await owner
      .from("public_research")
      .select("id")
      .eq("id", researchId)
    const otherRead = await other
      .from("public_research")
      .select("id")
      .eq("id", researchId)
    expect(ownerRead.data).toEqual([{ id: researchId }])
    expect(otherRead.data).toEqual([])

    const crossOwnerEdit = await other.rpc("update_research_record", {
      target_id: researchId,
      research_title: "Stolen",
      research_abstract: "No",
      research_publish_date: "2026-07-29",
    })
    expect(crossOwnerEdit.error).not.toBeNull()

    const directConfirm = await owner.rpc("confirm_research_upload", {
      target_id: researchId,
      owner_id: ownerAuth.data.user!.id,
    })
    expect(directConfirm.error).not.toBeNull()

    await service
      .from("researches")
      .update({
        pending_file_key: `pdfs/${researchId}/paper.pdf`,
        pending_file_name: "paper.pdf",
      })
      .eq("id", researchId)
    const confirmed = await service.rpc("confirm_research_upload", {
      target_id: researchId,
      owner_id: ownerAuth.data.user!.id,
    })
    expect(confirmed.error).toBeNull()

    const completed = await owner
      .from("public_research")
      .select("upload_complete,status")
      .eq("id", researchId)
      .single()
    expect(completed.data).toEqual({ upload_complete: true, status: "pending" })
  })
})
