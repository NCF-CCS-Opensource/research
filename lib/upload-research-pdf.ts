import { clientAction } from "@/lib/client-api"

export type UploadResearchPdfDeps = {
  presign: (
    researchId: string,
    filename: string,
    contentType: string
  ) => Promise<{ uploadUrl: string; key: string }>
  putToStorage: (uploadUrl: string, file: File) => Promise<boolean>
  confirm: (researchId: string) => Promise<{ message: string }>
}

export type UploadResearchPdfOutcome =
  | { status: "ok" }
  | { status: "storage-failed"; message: string }
  | { status: "confirm-failed"; message: string; key: string }

const defaultDeps: UploadResearchPdfDeps = {
  presign: (researchId, filename, contentType) =>
    clientAction<{ uploadUrl: string; key: string }>(
      `/research/${researchId}/upload-url`,
      "POST",
      { filename, contentType }
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
    clientAction<{ message: string }>(
      `/research/${researchId}/confirm-upload`,
      "POST"
    ),
}

// Owns the retryable presign -> PUT -> confirm sequence for an existing
// Research Record. Research Record creation is a separate, preceding step.
// Pass `resumeKey` (the `key` from a prior `confirm-failed` outcome) to
// retry only the confirm step without re-uploading bytes to storage.
export async function uploadResearchPdf(
  researchId: string,
  file: File,
  deps: UploadResearchPdfDeps = defaultDeps,
  resumeKey?: string
): Promise<UploadResearchPdfOutcome> {
  let key = resumeKey

  if (!key) {
    const presigned = await deps.presign(
      researchId,
      file.name,
      "application/pdf"
    )

    let putOk: boolean
    try {
      putOk = await deps.putToStorage(presigned.uploadUrl, file)
    } catch {
      putOk = false
    }
    if (!putOk) {
      return { status: "storage-failed", message: "PDF upload to storage failed" }
    }
    key = presigned.key
  }

  try {
    await deps.confirm(researchId)
  } catch (err) {
    return {
      status: "confirm-failed",
      message: err instanceof Error ? err.message : "Upload confirmation failed",
      key,
    }
  }

  return { status: "ok" }
}
