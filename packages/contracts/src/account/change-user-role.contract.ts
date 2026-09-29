import { z } from "zod"
import { accountRoleSchema } from "./account-role"
import { userSummarySchema } from "./list-users.contract"

export const changeUserRoleRequestSchema = z.object({
  profileId: z.string().uuid({ message: "Invalid Profile ID" }),
  role: accountRoleSchema,
})

export type ChangeUserRoleRequest = z.infer<typeof changeUserRoleRequestSchema>

export const changeUserRoleContract = {
  method: "POST" as const,
  path: "/account/change-user-role" as const,
  request: changeUserRoleRequestSchema,
  response: userSummarySchema,
}
