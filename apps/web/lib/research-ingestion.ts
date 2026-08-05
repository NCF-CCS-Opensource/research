import {
  type IngestInput,
  type IngestionDeps,
  type IngestOutcome,
} from "@repo/api-client"
import { researchLifecycle } from "@/lib/web-transport"

export const submitResearchRecord = researchLifecycle.submitRecord
export const replaceResearchPdf = researchLifecycle.replacePdf

export type { IngestInput, IngestionDeps, IngestOutcome }
