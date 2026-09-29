import { z } from "zod"
import { accountStatusSchema } from "./account-status"
import { userSummarySchema } from "./list-users.contract"

export const changeAccountStatusRequestSchema = z.object({
  profileId: z.string().uuid({ message: "Invalid Profile ID" }),
  status: accountStatusSchema,
})

export type ChangeAccountStatusRequest = z.infer<
  typeof changeAccountStatusRequestSchema
>

// Suspends or reactivates: the target status is the body.
export const changeAccountStatusContract = {
  method: "POST" as const,
  path: "/account/change-account-status" as const,
  request: changeAccountStatusRequestSchema,
  response: userSummarySchema,
}
