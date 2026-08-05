import { ApiError, callR2 } from "@/lib/api"
import { getSupabase } from "@/lib/supabase"

export type IngestInput = {
  title: string
  abstract: string
  publishDate?: string
  authors: Array<{ name: string; email?: string }>
  categoryIds: string[]
  keywordIds: string[]
  file: File
}

export async function createOwnedResearch(input: Omit<IngestInput, "file">) {
  const { data, error } = await getSupabase().rpc("create_research_record", {
    research_title: input.title,
    research_abstract: input.abstract,
    research_publish_date: input.publishDate || null,
    research_authors: input.authors,
    category_ids: input.categoryIds,
    keyword_ids: input.keywordIds,
  })
  if (error) throw new ApiError(error.message, 400)
  return { id: data as string }
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

const defaultDeps: IngestionDeps = {
  createRecord: createOwnedResearch,
  presign: (researchId, filename, contentType) =>
    callR2<{ uploadUrl: string; key: string }>({
      action: "presign-upload",
      researchId,
      filename,
      contentType,
    }),
  putToStorage: async (uploadUrl, file) => {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": "application/pdf" },
    })
    return response.ok
  },
  confirm: (researchId) =>
    callR2<{ message: string }>({
      action: "confirm-upload",
      researchId,
    }),
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

function validatePdfFile(file: File): { valid: true } | { valid: false; message: string } {
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return { valid: false, message: "Upload a PDF file." }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, message: "PDF must be 50 MB or smaller." }
  }
  return { valid: true }
}

export async function submitResearchRecord(
  input: IngestInput,
  deps: IngestionDeps = defaultDeps
): Promise<IngestOutcome> {
  const validation = validatePdfFile(input.file)
  if (!validation.valid) {
    return { status: "invalid-input", message: validation.message }
  }

  let created: { id: string }
  try {
    const { title, abstract, publishDate, authors, categoryIds, keywordIds } = input
    created = await deps.createRecord({
      title,
      abstract,
      publishDate,
      authors,
      categoryIds,
      keywordIds,
    })
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
  deps: IngestionDeps = defaultDeps
): Promise<IngestOutcome> {
  const validation = validatePdfFile(file)
  if (!validation.valid) {
    return { status: "invalid-input", message: validation.message }
  }

  return performUploadAndConfirm(researchId, file, deps)
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
