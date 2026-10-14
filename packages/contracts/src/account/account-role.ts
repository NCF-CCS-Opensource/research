import { z } from "zod"

export const accountRoleSchema = z.enum(["user", "admin", "instructor", "coordinator"])
export type AccountRole = z.infer<typeof accountRoleSchema>
