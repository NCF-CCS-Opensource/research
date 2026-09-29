import { z } from "zod"

export const accountRoleSchema = z.enum(["user", "admin"])
export type AccountRole = z.infer<typeof accountRoleSchema>
