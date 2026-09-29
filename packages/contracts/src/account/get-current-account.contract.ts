import { z } from "zod"
import { accountRoleSchema } from "./account-role"

export const currentAccountResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("registering") }),
  z.object({ status: z.literal("active"), role: accountRoleSchema }),
  z.object({ status: z.literal("suspended"), role: accountRoleSchema }),
])

export type CurrentAccountResponse = z.infer<
  typeof currentAccountResponseSchema
>

export const getCurrentAccountContract = {
  method: "GET" as const,
  path: "/account/get-current-account" as const,
  response: currentAccountResponseSchema,
}
