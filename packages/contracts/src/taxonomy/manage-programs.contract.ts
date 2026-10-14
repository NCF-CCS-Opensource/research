import { z } from "zod"

export const createProgramRequestSchema = z.object({ name: z.string().trim().min(1, "Program name is required").max(255) })
export const updateProgramRequestSchema = createProgramRequestSchema.extend({ active: z.boolean() })
export const programIdSchema = z.string().uuid("Invalid Program ID")

export const createProgramContract = { method: "POST" as const, path: "/programs/create" as const, request: createProgramRequestSchema }
export const updateProgramContract = { method: "PATCH" as const, path: "/programs/update/:programId" as const, request: updateProgramRequestSchema }
