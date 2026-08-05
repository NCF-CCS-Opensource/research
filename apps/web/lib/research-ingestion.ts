import {
  makeDefaultIngestionDeps,
  submitResearchRecord as submitResearchRecordImpl,
  replaceResearchPdf as replaceResearchPdfImpl,
  type IngestInput,
  type IngestionDeps,
  type IngestOutcome,
} from "@repo/api-client"
import { webTransport } from "@/lib/api"

const defaultDeps: IngestionDeps = makeDefaultIngestionDeps(webTransport)

export function submitResearchRecord(
  input: IngestInput,
  deps: IngestionDeps = defaultDeps
) {
  return submitResearchRecordImpl(input, deps)
}

export function replaceResearchPdf(
  researchId: string,
  file: File,
  deps: IngestionDeps = defaultDeps
) {
  return replaceResearchPdfImpl(researchId, file, deps)
}

export type { IngestInput, IngestionDeps, IngestOutcome }
