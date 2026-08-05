import { describe, expect, it, vi } from "vitest"
import { createInMemoryTransport } from "./transport"
import { createPdfAccess } from "./pdf-access"
import { ValidationError } from "./errors"

function makeModule(overrides: {
  rpc?: Record<string, unknown | ((params?: Record<string, unknown>) => unknown)>
  edge?: Record<string, unknown | ((params?: Record<string, unknown>) => unknown)>
} = {}) {
  const transport = createInMemoryTransport({
    userId: "user_1",
    rpc: {
      get_pdf_access_state: { state: "requestable" },
      create_pdf_request: "req_1",
      transition_pdf_request: "granted",
      get_pdf_access_dashboard: {
        mine: [],
        pending: [],
        grants: [],
      },
      ...overrides.rpc,
    },
    edge: {
      "email-pdf-access": { message: "sent" },
      "granted-download": { url: "https://r2.example/granted" },
      "owner-download": { url: "https://r2.example/owner" },
      "moderation-download": { url: "https://r2.example/moderation" },
      ...overrides.edge,
    },
  })
  return { transport, pdfAccess: createPdfAccess(transport) }
}

describe("pdfAccess module", () => {
  it("reads the access state for a research record", async () => {
    const stateRpc = vi.fn().mockReturnValue({ state: "granted", requestId: "req_1" })
    const { pdfAccess } = makeModule({ rpc: { get_pdf_access_state: stateRpc } })

    const state = await pdfAccess.getAccessState("res_1")

    expect(state).toEqual({ state: "granted", requestId: "req_1" })
    expect(stateRpc).toHaveBeenCalledWith({ target_research_id: "res_1" })
  })

  it("submits a request and dispatches the requested email", async () => {
    const createRpc = vi.fn().mockReturnValue("req_1")
    const emailEdge = vi.fn().mockResolvedValue({ message: "sent" })
    const { pdfAccess } = makeModule({
      rpc: { create_pdf_request: createRpc },
      edge: { "email-pdf-access": emailEdge },
    })

    const result = await pdfAccess.requestAccess("res_1", "Need this paper")

    expect(result).toEqual({ id: "req_1", status: "pending" })
    expect(createRpc).toHaveBeenCalledWith({
      target_research_id: "res_1",
      note: "Need this paper",
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(emailEdge).toHaveBeenCalledWith({
      event: "requested",
      requestId: "req_1",
    })
  })

  it("rejects a blank request note", async () => {
    const { pdfAccess } = makeModule()
    await expect(
      pdfAccess.requestAccess("res_1", "   ")
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it("trims the note and rejects notes longer than 1,000 characters", async () => {
    const createRpc = vi.fn().mockReturnValue("req_1")
    const { pdfAccess } = makeModule({
      rpc: { create_pdf_request: createRpc },
    })
    await pdfAccess.requestAccess("res_1", "  Need this paper  ")
    expect(createRpc).toHaveBeenCalledWith({
      target_research_id: "res_1",
      note: "Need this paper",
    })
    await expect(
      pdfAccess.requestAccess("res_1", "x".repeat(1001))
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it("transitions a request and dispatches the matching email event", async () => {
    const transitionRpc = vi.fn().mockReturnValue("revoked")
    const emailEdge = vi.fn().mockResolvedValue({ message: "sent" })
    const { pdfAccess } = makeModule({
      rpc: { transition_pdf_request: transitionRpc },
      edge: { "email-pdf-access": emailEdge },
    })

    const status = await pdfAccess.transitionRequest("req_1", "revoke")

    expect(status).toBe("revoked")
    expect(transitionRpc).toHaveBeenCalledWith({
      target_request_id: "req_1",
      action: "revoke",
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(emailEdge).toHaveBeenCalledWith({
      event: "revoke",
      requestId: "req_1",
    })
  })

  it("returns the access dashboard", async () => {
    const dashboard = {
      mine: [{ id: "req_1", researchTitle: "T", status: "pending" }],
      pending: [],
      grants: [],
    }
    const { pdfAccess } = makeModule({
      rpc: { get_pdf_access_dashboard: dashboard },
    })
    await expect(pdfAccess.getAccessDashboard()).resolves.toEqual(dashboard)
  })

  it("resolves download URLs from the R2 edges", async () => {
    const { pdfAccess } = makeModule()
    await expect(pdfAccess.getAuthorizedDownloadUrl("req_1")).resolves.toEqual({
      url: "https://r2.example/granted",
    })
    await expect(pdfAccess.getOwnerDownloadUrl("res_1")).resolves.toEqual({
      url: "https://r2.example/owner",
    })
    await expect(pdfAccess.getModerationDownloadUrl("res_1")).resolves.toEqual({
      url: "https://r2.example/moderation",
    })
  })
})
