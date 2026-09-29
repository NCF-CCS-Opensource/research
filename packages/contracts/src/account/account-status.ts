import { z } from "zod"

export const accountStatusSchema = z.enum(["active", "suspended"])
export type AccountStatus = z.infer<typeof accountStatusSchema>
