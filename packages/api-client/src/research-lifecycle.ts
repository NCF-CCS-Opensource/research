import type {
  AuditLog,
  ResearchDetail,
  ResearchRow,
  ResearchStatus,
} from "./types"
import { mapResearch } from "./types"
import { requireAuth, type TransportAdapter } from "./transport"
import { ValidationError } from "./errors"

export type IngestInput = {
  title: string
  abstract: string
  publishDate?: string
  authors: Array<{ name: string; email?: string }>
  categoryIds: string[]
  keywordIds: string[]
  file: File
}

export type IngestionDeps = {
  createRecord: (input: Omit<IngestInput, "file">) => Promise<{ id: string }>
  presign: (
    researchId: string,
    filename: string,
    contentType: string
  ) => Promise<{ uploadUrl: string; key: string }>
  putToStorage: (uploadUrl: string, file: File) => Promise<boolean>
  confirm: (researchId: string) => Promise<{ message: string }>
  resetRecordState: (researchId: string) => Promise<void>
  revokeGrants: (researchId: string) => Promise<void>
}

export type IngestOutcome =
  | { status: "completed"; researchId: string }
  | {
      status: "storage-failed"
      researchId: string
      message: string
      retry: () => Promise<IngestOutcome>
    }
  | {
      status: "confirm-failed"
      researchId: string
      message: string
      retry: () => Promise<IngestOutcome>
    }
  | { status: "invalid-input"; message: string }

export type UpdateRecordInput = {
  title: string
  abstract: string
  publishDate?: string
  authors: Array<{ name: string; email?: string }>
  categoryIds: string[]
  keywordIds: string[]
}

export type ModerateDecision = "approved" | "rejected"

export type ResearchLifecycle = {
  submitRecord(
    input: IngestInput,
    deps?: IngestionDeps
  ): Promise<IngestOutcome>
  replacePdf(
    researchId: string,
    file: File,
    deps?: IngestionDeps
  ): Promise<IngestOutcome>
  updateRecord(id: string, input: UpdateRecordInput): Promise<void>
  deleteRecord(id: string): Promise<void>
  resubmitRecord(id: string): Promise<void>
  getAdminQueue(status?: ResearchStatus): Promise<ResearchDetail[]>
  getOwnerRecords(): Promise<ResearchDetail[]>
  getOwnerRecord(id: string): Promise<ResearchDetail>
  moderate(id: string, decision: ModerateDecision, reason?: string): Promise<void>
  getAuditLogs(): Promise<AuditLog[]>
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export function validatePdfFile(file: File): {
  valid: true
} | { valid: false; message: string } {
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return { valid: false, message: "Upload a PDF file." }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, message: "PDF must be 50 MB or smaller." }
  }
  return { valid: true }
}

export function makeDefaultIngestionDeps(
  adapter: TransportAdapter
): IngestionDeps {
  return {
    createRecord: async (input) => {
      const id = await adapter.rpc<string>("create_research_record", {
        research_title: input.title,
        research_abstract: input.abstract,
        research_publish_date: input.publishDate || null,
        research_authors: input.authors,
        category_ids: input.categoryIds,
        keyword_ids: input.keywordIds,
      })
      return { id }
    },
    presign: (researchId, filename, contentType) =>
      adapter.invokeEdge<{ uploadUrl: string; key: string }>(
        "presign-upload",
        { researchId, filename, contentType }
      ),
    putToStorage: async (uploadUrl, file) => {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      })
      return response.ok
    },
    confirm: (researchId) =>
      adapter.invokeEdge<{ message: string }>("confirm-upload", {
        researchId,
      }),
    resetRecordState: (researchId) =>
      adapter.rpc("reset_research_status", { target_id: researchId }),
    revokeGrants: (researchId) =>
      adapter.rpc("revoke_all_pdf_grants", { target_research_id: researchId }),
  }
}

export async function submitResearchRecord(
  input: IngestInput,
  deps: IngestionDeps
): Promise<IngestOutcome> {
  const validation = validatePdfFile(input.file)
  if (!validation.valid) {
    return { status: "invalid-input", message: validation.message }
  }

  let created: { id: string }
  try {
    const { file, ...metadata } = input
    created = await deps.createRecord(metadata)
  } catch (err) {
    return {
      status: "invalid-input",
      message: err instanceof Error ? err.message : "Record creation failed",
    }
  }

  return performUploadAndConfirm(created.id, input.file, deps)
}

export async function replaceResearchPdf(
  researchId: string,
  file: File,
  deps: IngestionDeps
): Promise<IngestOutcome> {
  const validation = validatePdfFile(file)
  if (!validation.valid) {
    return { status: "invalid-input", message: validation.message }
  }

  const outcome = await performUploadAndConfirm(researchId, file, deps)
  if (outcome.status !== "completed") return outcome

  await deps.resetRecordState(researchId)
  await deps.revokeGrants(researchId)

  return outcome
}

async function performUploadAndConfirm(
  researchId: string,
  file: File,
  deps: IngestionDeps,
  skipUpload = false
): Promise<IngestOutcome> {
  if (!skipUpload) {
    let presigned: { uploadUrl: string; key: string }
    try {
      presigned = await deps.presign(researchId, file.name, "application/pdf")
    } catch (err) {
      return {
        status: "storage-failed",
        researchId,
        message: err instanceof Error ? err.message : "Presign failed",
        retry: () => performUploadAndConfirm(researchId, file, deps, false),
      }
    }

    let putOk: boolean
    try {
      putOk = await deps.putToStorage(presigned.uploadUrl, file)
    } catch {
      putOk = false
    }

    if (!putOk) {
      return {
        status: "storage-failed",
        researchId,
        message: "PDF upload to storage failed",
        retry: () => performUploadAndConfirm(researchId, file, deps, false),
      }
    }
  }

  try {
    await deps.confirm(researchId)
  } catch (err) {
    return {
      status: "confirm-failed",
      researchId,
      message: err instanceof Error ? err.message : "Upload confirmation failed",
      retry: () => performUploadAndConfirm(researchId, file, deps, true),
    }
  }

  return { status: "completed", researchId }
}

export function createResearchLifecycle(
  adapter: TransportAdapter
): ResearchLifecycle {
  const defaultDeps = makeDefaultIngestionDeps(adapter)
  const requireCurrentUser = requireAuth(adapter)

  async function updateRecord(id: string, input: UpdateRecordInput) {
    await adapter.rpc("update_research_record", {
      target_id: id,
      research_title: input.title,
      research_abstract: input.abstract,
      research_publish_date: input.publishDate || null,
      research_authors: input.authors,
      category_ids: input.categoryIds,
      keyword_ids: input.keywordIds,
    })
  }

  return {
    submitRecord: (input, deps) =>
      submitResearchRecord(input, deps ?? defaultDeps),
    replacePdf: (researchId, file, deps) =>
      replaceResearchPdf(researchId, file, deps ?? defaultDeps),
    updateRecord,

    async deleteRecord(id) {
      const userId = await requireCurrentUser()
      await adapter.remove("researches", { id, uploader_id: userId })
    },

    async resubmitRecord(id) {
      await adapter.rpc("resubmit_research", { target_id: id })
    },

    async getAdminQueue(status) {
      const rows = await adapter.select<ResearchRow>("public_research", {
        ...(status ? { eq: { status } } : {}),
        order: { column: "created_at", ascending: false },
      })
      return rows.map(mapResearch)
    },

    async getOwnerRecords() {
      const userId = await requireCurrentUser()
      const rows = await adapter.select<ResearchRow>("public_research", {
        eq: { uploader_id: userId },
        order: { column: "created_at", ascending: false },
      })
      return rows.map(mapResearch)
    },

    async getOwnerRecord(id) {
      const userId = await requireCurrentUser()
      const row = await adapter.selectOne<ResearchRow>("public_research", {
        eq: { id, uploader_id: userId },
      })
      return mapResearch(row)
    },

    async moderate(id, decision, reason) {
      if (decision === "rejected" && !reason?.trim()) {
        throw new ValidationError("Rejection reason is required")
      }
      await adapter.rpc("moderate_research", {
        target_id: id,
        decision,
        reason: reason ?? null,
      })
      await adapter.invokeEdge("email-research-moderation", {
        researchId: id,
      })
    },

    async getAuditLogs() {
      return adapter.select<AuditLog>("audit_logs", {
        columns: "id,admin_id,research_id,action,meta,created_at",
        order: { column: "created_at", ascending: false },
      })
    },
  }
}
