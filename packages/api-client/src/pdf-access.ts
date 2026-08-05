import type { PdfAccessDashboard, PdfAccessState } from "./types"
import type { TransportAdapter } from "./transport"
import { ValidationError } from "./errors"

export type PdfRequestAction = "cancel" | "approve" | "reject" | "revoke"

export type PdfAccess = {
  getAccessState(researchId: string): Promise<PdfAccessState>
  requestAccess(
    researchId: string,
    note: string
  ): Promise<{ id: string; status: "pending" }>
  transitionRequest(
    requestId: string,
    action: PdfRequestAction
  ): Promise<string>
  getAccessDashboard(): Promise<PdfAccessDashboard>
  getAuthorizedDownloadUrl(requestId: string): Promise<{ url: string }>
  getOwnerDownloadUrl(researchId: string): Promise<{ url: string }>
  getModerationDownloadUrl(researchId: string): Promise<{ url: string }>
}

export function createPdfAccess(adapter: TransportAdapter): PdfAccess {
  return {
    async getAccessState(researchId) {
      return adapter.rpc<PdfAccessState>("get_pdf_access_state", {
        target_research_id: researchId,
      })
    },

    async requestAccess(researchId, note) {
      const trimmed = note.trim()
      if (!trimmed || trimmed.length > 1000) {
        throw new ValidationError(
          "Request Note must be between 1 and 1,000 characters"
        )
      }
      const id = await adapter.rpc<string>("create_pdf_request", {
        target_research_id: researchId,
        note: trimmed,
      })
      void adapter
        .invokeEdge("email-pdf-access", {
          event: "requested",
          requestId: id,
        })
        .catch(() => {})
      return { id, status: "pending" }
    },

    async transitionRequest(requestId, action) {
      const status = await adapter.rpc<string>("transition_pdf_request", {
        target_request_id: requestId,
        action,
      })
      void adapter
        .invokeEdge("email-pdf-access", { event: action, requestId })
        .catch(() => {})
      return status
    },

    async getAccessDashboard() {
      return adapter.rpc<PdfAccessDashboard>("get_pdf_access_dashboard")
    },

    getAuthorizedDownloadUrl: (requestId) =>
      adapter.invokeEdge<{ url: string }>("granted-download", { requestId }),

    getOwnerDownloadUrl: (researchId) =>
      adapter.invokeEdge<{ url: string }>("owner-download", { researchId }),

    getModerationDownloadUrl: (researchId) =>
      adapter.invokeEdge<{ url: string }>("moderation-download", {
        researchId,
      }),
  }
}
