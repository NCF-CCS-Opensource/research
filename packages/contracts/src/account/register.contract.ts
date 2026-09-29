import { z } from "zod"
import { accountRoleSchema } from "./account-role"

export const registerRequestSchema = z.object({
  fullName: z.string().trim().min(1, { message: "Full name is required" }),
  programId: z.string().uuid({ message: "Invalid Program ID" }).optional(),
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>

export const registerResponseSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  programId: z.string().uuid().nullable(),
  role: accountRoleSchema,
  status: z.enum(["active", "suspended"]),
})

export type RegisterResponse = z.infer<typeof registerResponseSchema>

export const registerContract = {
  method: "POST" as const,
  path: "/account/register" as const,
  request: registerRequestSchema,
  response: registerResponseSchema,
}
