import { z } from "zod"
import {
  registerRequestSchema,
  registerResponseSchema,
} from "./register.contract"

// Same field rules and messages as Registration; an absent Program clears it.
export const updateProfileRequestSchema = registerRequestSchema.extend({
  programId: registerRequestSchema.shape.programId.nullable(),
})

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

export const updateProfileContract = {
  method: "POST" as const,
  path: "/account/update-profile" as const,
  request: updateProfileRequestSchema,
  response: registerResponseSchema,
}
