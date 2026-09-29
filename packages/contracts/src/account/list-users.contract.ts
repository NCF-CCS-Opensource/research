import { z } from "zod"
import { accountRoleSchema } from "./account-role"
import { accountStatusSchema } from "./account-status"

export const userSummarySchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  programId: z.string().uuid().nullable(),
  programName: z.string().nullable(),
  role: accountRoleSchema,
  status: accountStatusSchema,
})

export type UserSummary = z.infer<typeof userSummarySchema>

export const listUsersContract = {
  method: "GET" as const,
  path: "/account/list-users" as const,
  response: z.array(userSummarySchema),
}
