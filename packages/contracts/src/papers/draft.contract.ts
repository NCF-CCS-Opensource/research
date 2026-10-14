import { z } from "zod"

export const researchTypes = [
  "quantitative",
  "qualitative",
  "mixed_methods",
  "developmental",
] as const
export const authorSchema = z.object({
  displayName: z.string().trim().min(1, "Author name is required").max(255),
  kind: z.enum(["person", "organization"]),
  givenName: z.string().trim().max(100).optional(),
  familyName: z.string().trim().max(100).optional(),
})
export const paperDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Title must be at least 10 characters")
    .max(300, "Title must be at most 300 characters"),
  abstract: z
    .string()
    .trim()
    .min(100, "Abstract must be at least 100 characters")
    .max(5000, "Abstract must be at most 5,000 characters")
    .refine((value) => !/<[^>]*>/.test(value), "Abstract must be plain text"),
  authors: z
    .array(authorSchema)
    .min(1, "Add at least one Author")
    .max(20, "No more than 20 Authors are allowed"),
  year: z.number().int().min(1900).max(new Date().getFullYear()),
  researchType: z.enum(researchTypes),
  keywords: z
    .array(z.string().trim().min(2).max(50))
    .min(3, "Add at least 3 keywords")
    .max(10, "No more than 10 keywords are allowed")
    .refine(
      (values) =>
        new Set(values.map((v) => v.toLocaleLowerCase())).size ===
        values.length,
      "Keywords must be unique"
    ),
  programId: z.string().uuid(),
})
export const paperSchema = paperDetailsSchema.extend({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  publicId: z.string(),
  ownerId: z.string().uuid(),
  adviserId: z.string().uuid(),
  status: z.enum(["draft", "submitted"]),
  lockVersion: z.number().int(),
})
export type PaperDetails = z.infer<typeof paperDetailsSchema>
export type Paper = z.infer<typeof paperSchema>
export const createPaperContract = {
  method: "POST" as const,
  path: "/papers/create-draft" as const,
  request: paperDetailsSchema.extend({ adviserId: z.string().uuid() }),
  response: paperSchema,
}
export type CreatePaperRequest = z.infer<typeof createPaperContract.request>
export const listMyPapersContract = {
  method: "GET" as const,
  path: "/papers/list-mine" as const,
  response: z.array(paperSchema),
}
export const getPaperContract = {
  method: "GET" as const,
  path: "/papers/get/:publicId" as const,
  response: paperSchema,
}
export const updatePaperContract = {
  method: "PATCH" as const,
  path: "/papers/update/:publicId" as const,
  request: paperDetailsSchema.extend({
    adviserId: z.string().uuid(),
    expectedLockVersion: z.number().int().nonnegative(),
  }),
  response: paperSchema,
}
export type UpdatePaperRequest = z.infer<typeof updatePaperContract.request>
export const deletePaperContract = {
  method: "DELETE" as const,
  path: "/papers/delete/:publicId" as const,
  response: z.object({ deleted: z.literal(true) }),
}
export const listAdvisersContract = {
  method: "GET" as const,
  path: "/papers/list-advisers" as const,
  response: z.array(z.object({ id: z.string().uuid(), fullName: z.string() })),
}
