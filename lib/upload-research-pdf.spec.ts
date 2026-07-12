import { describe, expect, it, vi } from "vitest"

import { uploadResearchPdf } from "./upload-research-pdf"

function makeFile() {
  return new File(["%PDF-1.4"], "paper.pdf", { type: "application/pdf" })
}

function makeDeps(overrides: Partial<Parameters<typeof uploadResearchPdf>[2]> = {}) {
  return {
    presign: vi.fn().mockResolvedValue({ uploadUrl: "https://r2.example/upload", key: "pdfs/r1/1-paper.pdf" }),
    putToStorage: vi.fn().mockResolvedValue(true),
    confirm: vi.fn().mockResolvedValue({ message: "Upload confirmed" }),
    ...overrides,
  }
}

describe("uploadResearchPdf", () => {
  it("returns ok when presign, put, and confirm all succeed", async () => {
    const deps = makeDeps()
    const result = await uploadResearchPdf("r1", makeFile(), deps)
    expect(result).toEqual({ status: "ok" })
    expect(deps.presign).toHaveBeenCalledWith("r1", "paper.pdf", "application/pdf")
    expect(deps.putToStorage).toHaveBeenCalledWith("https://r2.example/upload", expect.any(File))
    expect(deps.confirm).toHaveBeenCalledWith("r1")
  })

  it("returns storage-failed and never calls confirm when putToStorage returns false", async () => {
    const deps = makeDeps({ putToStorage: vi.fn().mockResolvedValue(false) })
    const result = await uploadResearchPdf("r1", makeFile(), deps)
    expect(result).toEqual({ status: "storage-failed", message: expect.any(String) })
    expect(deps.confirm).not.toHaveBeenCalled()
  })

  it("returns storage-failed and never calls confirm when putToStorage rejects", async () => {
    const deps = makeDeps({ putToStorage: vi.fn().mockRejectedValue(new Error("network down")) })
    const result = await uploadResearchPdf("r1", makeFile(), deps)
    expect(result).toEqual({ status: "storage-failed", message: expect.any(String) })
    expect(deps.confirm).not.toHaveBeenCalled()
  })

  it("returns confirm-failed with the pending key when confirm rejects after a successful upload", async () => {
    const deps = makeDeps({ confirm: vi.fn().mockRejectedValue(new Error("File not found in storage")) })
    const result = await uploadResearchPdf("r1", makeFile(), deps)
    expect(result).toEqual({
      status: "confirm-failed",
      message: "File not found in storage",
      key: "pdfs/r1/1-paper.pdf",
    })
  })

  it("skips presign and put when resuming from a pending key", async () => {
    const deps = makeDeps()
    const result = await uploadResearchPdf("r1", makeFile(), deps, "pdfs/r1/1-paper.pdf")
    expect(result).toEqual({ status: "ok" })
    expect(deps.presign).not.toHaveBeenCalled()
    expect(deps.putToStorage).not.toHaveBeenCalled()
    expect(deps.confirm).toHaveBeenCalledWith("r1")
  })
})
