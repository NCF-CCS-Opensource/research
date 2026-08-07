import { execFileSync } from "node:child_process"
import { createClient } from "@supabase/supabase-js"
import { beforeAll, describe, expect, it } from "vitest"
import { authenticatedClient, type LocalStatus, user } from "./user"

let status: LocalStatus

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
    const ownerUser = await user(service, status, `owner-${suffix}`)
    const otherUser = await user(service, status, `other-${suffix}`)
    const owner = ownerUser.client
    const other = otherUser.client

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
      research_authors: [{ name: "Other Author" }],
      category_ids: [],
      keyword_ids: [],
    })
    expect(crossOwnerEdit.error).not.toBeNull()

    const ownerEdit = await owner.rpc("update_research_record", {
      target_id: researchId,
      research_title: "Owner-only Draft",
      research_abstract: "Updated relationships.",
      research_publish_date: "2026-07-29",
      research_authors: [{ name: "Updated Author" }],
      category_ids: [],
      keyword_ids: [],
    })
    expect(ownerEdit.error).toBeNull()
    expect(
      (
        await owner
          .from("public_research")
          .select("authors")
          .eq("id", researchId)
          .single()
      ).data?.authors
    ).toEqual([expect.objectContaining({ name: "Updated Author" })])

    const directConfirm = await owner.rpc("confirm_research_upload", {
      target_id: researchId,
      owner_id: ownerUser.id,
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
      owner_id: ownerUser.id,
    })
    expect(confirmed.error).toBeNull()

    const completed = await owner
      .from("public_research")
      .select("upload_complete,status")
      .eq("id", researchId)
      .single()
    expect(completed.data).toEqual({
      upload_complete: true,
      status: "pending",
    })

    const ownerDownload = await owner.functions.invoke("r2", {
      body: { action: "owner-download", researchId },
    })
    expect(ownerDownload.error).toBeNull()
    expect(ownerDownload.data?.url).toMatch(/^https?:\/\//)

    const crossOwnerDownload = await other.functions.invoke("r2", {
      body: { action: "owner-download", researchId },
    })
    expect(crossOwnerDownload.error).not.toBeNull()

    const unauthenticatedClient = createClient(
      status.API_URL,
      status.PUBLISHABLE_KEY
    )
    expect(
      (
        await unauthenticatedClient.functions.invoke("r2", {
          body: { action: "owner-download", researchId },
        })
      ).error
    ).not.toBeNull()
    const invalidTokenClient = createClient(
      status.API_URL,
      status.PUBLISHABLE_KEY,
      {
        accessToken: async () => "invalid",
      }
    )
    expect(
      (
        await invalidTokenClient.functions.invoke("r2", {
          body: { action: "owner-download", researchId },
        })
      ).error
    ).not.toBeNull()
    expect(
      (
        await authenticatedClient(status, ownerUser.id, -1).functions.invoke(
          "r2",
          {
            body: { action: "owner-download", researchId },
          }
        )
      ).error
    ).not.toBeNull()

    await service
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", ownerUser.id)
    expect(
      (
        await owner.functions.invoke("r2", {
          body: { action: "owner-download", researchId },
        })
      ).error
    ).not.toBeNull()
    await service
      .from("profiles")
      .update({ status: "active" })
      .eq("id", ownerUser.id)
  })
})
