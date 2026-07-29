import { callR2 } from "@/lib/api"

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
  | { status: "confirm-failed"; message: string }

const defaultDeps: UploadResearchPdfDeps = {
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

// Owns the retryable presign -> PUT -> confirm sequence for an existing
// Research Record. Research Record creation is a separate, preceding step.
// Pass `skipUpload: true` (after a prior `confirm-failed` outcome) to retry
// only the confirm step — the trusted function already has the pending file key on
// file, so the frontend never needs to track or resend it.
export async function uploadResearchPdf(
  researchId: string,
  file: File,
  deps: UploadResearchPdfDeps = defaultDeps,
  skipUpload = false
): Promise<UploadResearchPdfOutcome> {
  if (!skipUpload) {
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
      return {
        status: "storage-failed",
        message: "PDF upload to storage failed",
      }
    }
  }

  try {
    await deps.confirm(researchId)
  } catch (err) {
    return {
      status: "confirm-failed",
      message:
        err instanceof Error ? err.message : "Upload confirmation failed",
    }
  }

  return { status: "ok" }
}
