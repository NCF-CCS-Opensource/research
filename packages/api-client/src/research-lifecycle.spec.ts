import { describe, expect, it, vi } from "vitest"
import { createInMemoryTransport } from "./transport"
import {
  createResearchLifecycle,
  replaceResearchPdf,
  submitResearchRecord,
  type IngestInput,
  type IngestionDeps,
} from "./research-lifecycle"
import { ValidationError } from "./errors"

function makePdfFile(size = 1000, type = "application/pdf") {
  const content = new ArrayBuffer(size)
  return new File([content], "paper.pdf", { type })
}

function makeValidInput(overrides: Partial<IngestInput> = {}): IngestInput {
  return {
    title: "Test Title",
    abstract: "Test Abstract",
    authors: [{ name: "Alice" }],
    categoryIds: ["cat1"],
    keywordIds: ["kw1"],
    file: makePdfFile(),
    ...overrides,
  }
}

function makeDeps(overrides: Partial<IngestionDeps> = {}): IngestionDeps {
  return {
    createRecord: vi.fn().mockResolvedValue({ id: "res_123" }),
    presign: vi.fn().mockResolvedValue({
      uploadUrl: "https://r2.example/upload",
      key: "pdfs/res_123/paper.pdf",
    }),
    putToStorage: vi.fn().mockResolvedValue(true),
    confirm: vi.fn().mockResolvedValue({ message: "Upload confirmed" }),
    ...overrides,
  }
}

const researchRow = (overrides: Record<string, unknown> = {}) => ({
  id: "res_1",
  title: "Deep Modules",
  abstract: "An abstract",
  publish_date: "2026-01-01",
  status: "approved",
  uploader_id: "user_1",
  upload_complete: true,
  view_count: 1,
  download_count: 2,
  citation_export_count: 3,
  created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  authors: [{ id: "a1", name: "Ada" }],
  categories: [],
  keywords: [],
  ...overrides,
})

describe("submitRecord / replacePdf", () => {
  it("completes the direct upload workflow with retry closures on storage failure", async () => {
    const deps = makeDeps({
      putToStorage: vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
    })

    const result = await submitResearchRecord(makeValidInput(), deps)

    expect(result.status).toBe("storage-failed")
    if (result.status !== "storage-failed") return
    expect(deps.confirm).not.toHaveBeenCalled()

    const retryResult = await result.retry()
    expect(retryResult).toEqual({ status: "completed", researchId: "res_123" })
    expect(deps.putToStorage).toHaveBeenCalledTimes(2)
  })

  it("retries confirm without re-running presign or upload", async () => {
    const deps = makeDeps({
      confirm: vi
        .fn()
        .mockRejectedValueOnce(new Error("Confirm error"))
        .mockResolvedValueOnce({ message: "Confirmed" }),
    })

    const result = await submitResearchRecord(makeValidInput(), deps)

    expect(result.status).toBe("confirm-failed")
    if (result.status !== "confirm-failed") return

    const retryResult = await result.retry()
    expect(retryResult).toEqual({ status: "completed", researchId: "res_123" })
    expect(deps.presign).toHaveBeenCalledTimes(1)
    expect(deps.putToStorage).toHaveBeenCalledTimes(1)
    expect(deps.confirm).toHaveBeenCalledTimes(2)
  })

  it("rejects non-PDF files before touching adapters", async () => {
    const deps = makeDeps()
    const result = await submitResearchRecord(
      makeValidInput({ file: makePdfFile(100, "image/png") }),
      deps
    )
    expect(result).toEqual({ status: "invalid-input", message: "Upload a PDF file." })
    expect(deps.createRecord).not.toHaveBeenCalled()
  })

  it("replaces the PDF for an existing record without creating a new one", async () => {
    const deps = makeDeps()
    const result = await replaceResearchPdf("res_999", makePdfFile(), deps)
    expect(result).toEqual({ status: "completed", researchId: "res_999" })
    expect(deps.createRecord).not.toHaveBeenCalled()
    expect(deps.presign).toHaveBeenCalledWith(
      "res_999",
      "paper.pdf",
      "application/pdf"
    )
  })
})

describe("researchLifecycle module", () => {
  function makeModule() {
    const transport = createInMemoryTransport({
      userId: "user_1",
      rpc: {
        create_research_record: "res_new",
        update_research_record: undefined,
        moderate_research: undefined,
        resubmit_research: undefined,
      },
      edge: {
        "presign-upload": { uploadUrl: "https://r2.example/upload", key: "k" },
        "confirm-upload": { message: "ok" },
        "email-research-moderation": { message: "sent" },
      },
      tables: {
        public_research: [researchRow()],
        researches: [{ id: "res_1", uploader_id: "user_1" }],
        audit_logs: [
          {
            id: "log_1",
            admin_id: "admin_1",
            research_id: "res_1",
            action: "approve",
            meta: null,
            created_at: "2026-01-03T00:00:00Z",
          },
        ],
      },
    })
    return { transport, lifecycle: createResearchLifecycle(transport) }
  }

  it("submits a record end-to-end through the default adapter deps", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    )
    const { lifecycle } = makeModule()
    const outcome = await lifecycle.submitRecord(makeValidInput())
    expect(outcome).toEqual({ status: "completed", researchId: "res_new" })
    vi.unstubAllGlobals()
  })

  it("lists the admin queue with status filter", async () => {
    const { lifecycle } = makeModule()
    const queue = await lifecycle.getAdminQueue("approved")
    expect(queue).toHaveLength(1)
    expect(queue[0]).toMatchObject({ id: "res_1", status: "approved" })
  })

  it("returns only the current owner's records", async () => {
    const { lifecycle } = makeModule()
    const records = await lifecycle.getOwnerRecords()
    expect(records).toHaveLength(1)
    expect(records[0].uploaderId).toBe("user_1")
  })

  it("deletes only the owner's record", async () => {
    const { lifecycle, transport } = makeModule()
    await lifecycle.deleteRecord("res_1")
    expect(await transport.select("researches")).toEqual([])
  })

  it("requires authentication for owner operations", async () => {
    const transport = createInMemoryTransport({
      rpc: {},
      tables: { researches: [], public_research: [] },
    })
    const lifecycle = createResearchLifecycle(transport)
    await expect(lifecycle.getOwnerRecords()).rejects.toThrow(
      "Authentication required"
    )
  })

  it("moderates and dispatches the owner email", async () => {
    const moderateRpc = vi.fn().mockReturnValue(undefined)
    const emailEdge = vi.fn().mockResolvedValue({ message: "sent" })
    const transport = createInMemoryTransport({
      rpc: { moderate_research: moderateRpc },
      edge: { "email-research-moderation": emailEdge },
    })
    const lifecycle = createResearchLifecycle(transport)
    await lifecycle.moderate("res_1", "approved")
    expect(moderateRpc).toHaveBeenCalledWith({
      target_id: "res_1",
      decision: "approved",
      reason: null,
    })
    expect(emailEdge).toHaveBeenCalledWith({ researchId: "res_1" })
  })

  it("requires a rejection reason when rejecting", async () => {
    const { lifecycle } = makeModule()
    await expect(
      lifecycle.moderate("res_1", "rejected")
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it("returns audit logs ordered by recency", async () => {
    const { lifecycle } = makeModule()
    const logs = await lifecycle.getAuditLogs()
    expect(logs[0]).toMatchObject({ action: "approve", research_id: "res_1" })
  })

  it("forwards update and resubmit to their RPCs", async () => {
    const updateRpc = vi.fn().mockReturnValue(undefined)
    const resubmitRpc = vi.fn().mockReturnValue(undefined)
    const transport = createInMemoryTransport({
      rpc: { update_research_record: updateRpc, resubmit_research: resubmitRpc },
    })
    const lifecycle = createResearchLifecycle(transport)
    const input = {
      title: "New",
      abstract: "New abstract",
      authors: [{ name: "Bob" }],
      categoryIds: ["cat2"],
      keywordIds: [],
    }
    await lifecycle.updateRecord("res_1", input)
    expect(updateRpc).toHaveBeenCalledWith({
      target_id: "res_1",
      research_title: "New",
      research_abstract: "New abstract",
      research_publish_date: null,
      research_authors: [{ name: "Bob" }],
      category_ids: ["cat2"],
      keyword_ids: [],
    })
    await lifecycle.resubmitRecord("res_1")
    expect(resubmitRpc).toHaveBeenCalledWith({ target_id: "res_1" })
  })
})
