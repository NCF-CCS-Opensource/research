import type { Program } from "@repo/contracts"

export const PROGRAM_QUERY = Symbol("PROGRAM_QUERY")

export interface ProgramQuery {
  list(): Promise<Program[]>
}
