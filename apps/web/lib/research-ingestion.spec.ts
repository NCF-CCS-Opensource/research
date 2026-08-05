import { describe, expect, it, vi } from "vitest"

import {
  replaceResearchPdf,
  submitResearchRecord,
  type IngestInput,
  type IngestionDeps,
} from "./research-ingestion"

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

describe("submitResearchRecord", () => {
  it("rejects non-PDF files without calling createRecord or adapters", async () => {
    const deps = makeDeps()
    const input = makeValidInput({ file: makePdfFile(100, "image/png") })

    const result = await submitResearchRecord(input, deps)

    expect(result).toEqual({
      status: "invalid-input",
      message: "Upload a PDF file.",
    })
    expect(deps.createRecord).not.toHaveBeenCalled()
    expect(deps.presign).not.toHaveBeenCalled()
  })

  it("rejects files exceeding 50 MB without calling adapters", async () => {
    const deps = makeDeps()
    const oversizedFile = makePdfFile(50 * 1024 * 1024 + 1)
    const input = makeValidInput({ file: oversizedFile })

    const result = await submitResearchRecord(input, deps)

    expect(result).toEqual({
      status: "invalid-input",
      message: "PDF must be 50 MB or smaller.",
    })
    expect(deps.createRecord).not.toHaveBeenCalled()
  })

  it("returns invalid-input when createRecord fails", async () => {
    const deps = makeDeps({
      createRecord: vi.fn().mockRejectedValue(new Error("RPC failed")),
    })

    const result = await submitResearchRecord(makeValidInput(), deps)

    expect(result).toEqual({
      status: "invalid-input",
      message: "RPC failed",
    })
    expect(deps.presign).not.toHaveBeenCalled()
  })

  it("completes full direct object upload flow when all steps succeed", async () => {
    const deps = makeDeps()
    const input = makeValidInput()

    const result = await submitResearchRecord(input, deps)

    expect(result).toEqual({
      status: "completed",
      researchId: "res_123",
    })
    expect(deps.createRecord).toHaveBeenCalledWith({
      title: "Test Title",
      abstract: "Test Abstract",
      authors: [{ name: "Alice" }],
      categoryIds: ["cat1"],
      keywordIds: ["kw1"],
    })
    expect(deps.presign).toHaveBeenCalledWith("res_123", "paper.pdf", "application/pdf")
    expect(deps.putToStorage).toHaveBeenCalledWith("https://r2.example/upload", input.file)
    expect(deps.confirm).toHaveBeenCalledWith("res_123")
  })

  it("handles storage failure and provides working retry closure", async () => {
    const deps = makeDeps({
      putToStorage: vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
    })

    const result = await submitResearchRecord(makeValidInput(), deps)

    expect(result.status).toBe("storage-failed")
    if (result.status !== "storage-failed") return

    expect(result.researchId).toBe("res_123")
    expect(result.message).toBe("PDF upload to storage failed")
    expect(deps.confirm).not.toHaveBeenCalled()

    // Execute retry
    const retryResult = await result.retry()
    expect(retryResult).toEqual({
      status: "completed",
      researchId: "res_123",
    })
    expect(deps.putToStorage).toHaveBeenCalledTimes(2)
    expect(deps.confirm).toHaveBeenCalledWith("res_123")
  })

  it("handles confirm failure and provides retry closure that skips re-upload", async () => {
    const deps = makeDeps({
      confirm: vi
        .fn()
        .mockRejectedValueOnce(new Error("Confirm error"))
        .mockResolvedValueOnce({ message: "Confirmed" }),
    })

    const result = await submitResearchRecord(makeValidInput(), deps)

    expect(result.status).toBe("confirm-failed")
    if (result.status !== "confirm-failed") return

    expect(result.researchId).toBe("res_123")
    expect(result.message).toBe("Confirm error")

    // Execute retry
    const retryResult = await result.retry()
    expect(retryResult).toEqual({
      status: "completed",
      researchId: "res_123",
    })
    // presign and putToStorage should NOT be called again on retry of confirm-failed
    expect(deps.presign).toHaveBeenCalledTimes(1)
    expect(deps.putToStorage).toHaveBeenCalledTimes(1)
    expect(deps.confirm).toHaveBeenCalledTimes(2)
  })
})

describe("replaceResearchPdf", () => {
  it("rejects invalid file before calling presign", async () => {
    const deps = makeDeps()
    const invalidFile = makePdfFile(100, "text/plain")

    const result = await replaceResearchPdf("res_999", invalidFile, deps)

    expect(result).toEqual({
      status: "invalid-input",
      message: "Upload a PDF file.",
    })
    expect(deps.presign).not.toHaveBeenCalled()
  })

  it("uploads replacement PDF for existing research record", async () => {
    const deps = makeDeps()
    const file = makePdfFile()

    const result = await replaceResearchPdf("res_999", file, deps)

    expect(result).toEqual({
      status: "completed",
      researchId: "res_999",
    })
    expect(deps.createRecord).not.toHaveBeenCalled()
    expect(deps.presign).toHaveBeenCalledWith("res_999", "paper.pdf", "application/pdf")
    expect(deps.putToStorage).toHaveBeenCalledWith("https://r2.example/upload", file)
    expect(deps.confirm).toHaveBeenCalledWith("res_999")
  })
})
