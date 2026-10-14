import { z } from "zod"

export const settingsSchema = z.object({
  defaultAccessGrantDays: z
    .number()
    .int()
    .min(1, "Default Access Grant length must be at least 1 day."),
  maximumAccessGrantDays: z
    .number()
    .int()
    .min(1, "Maximum Access Grant length must be at least 1 day."),
  pendingRequestDays: z
    .number()
    .int()
    .min(1, "Pending request lifetime must be at least 1 day."),
  institutionName: z
    .string()
    .trim()
    .min(1, "Institution name is required.")
    .max(255),
})

export const updateSettingsRequestSchema = settingsSchema.superRefine(
  (value, ctx) => {
    if (value.defaultAccessGrantDays > value.maximumAccessGrantDays) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultAccessGrantDays"],
        message: "Default Access Grant length cannot exceed the maximum.",
      })
    }
  }
)

export const getSettingsContract = {
  method: "GET" as const,
  path: "/settings/get" as const,
  response: settingsSchema,
}
export const updateSettingsContract = {
  method: "PATCH" as const,
  path: "/settings/update" as const,
  request: updateSettingsRequestSchema,
  response: settingsSchema,
}
export type Settings = z.infer<typeof settingsSchema>
export type UpdateSettingsRequest = z.infer<typeof updateSettingsRequestSchema>
