import { z } from "zod"

export const settingsSchema = z.object({
  defaultAccessGrantDays: z.number().int().min(1),
  maximumAccessGrantDays: z.number().int().min(1),
  pendingRequestDays: z.number().int().min(1),
  institutionName: z.string().trim().min(1).max(255),
})

export const updateSettingsRequestSchema = settingsSchema.superRefine((value, ctx) => {
  if (value.defaultAccessGrantDays > value.maximumAccessGrantDays) {
    ctx.addIssue({ code: "custom", path: ["defaultAccessGrantDays"], message: "Default Access Grant length cannot exceed the maximum." })
  }
})

export const getSettingsContract = { method: "GET" as const, path: "/settings/get" as const, response: settingsSchema }
export const updateSettingsContract = { method: "PATCH" as const, path: "/settings/update" as const, request: updateSettingsRequestSchema, response: settingsSchema }
export type Settings = z.infer<typeof settingsSchema>
export type UpdateSettingsRequest = z.infer<typeof updateSettingsRequestSchema>
