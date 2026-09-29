import { z } from "zod"

export const taxonomyNameSchema = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(1, { message: "Name is required" })
  .max(255, { message: "Name must be 255 characters or fewer" })

const idSchema = z.string().uuid({ message: "Invalid ID" })

export const taxonomyItemSchema = z.object({
  id: idSchema,
  name: taxonomyNameSchema,
})

export type TaxonomyItem = z.infer<typeof taxonomyItemSchema>

export const createTaxonomyRequestSchema = z.object({ name: taxonomyNameSchema })
export const renameTaxonomyRequestSchema = z.object({
  id: idSchema,
  name: taxonomyNameSchema,
})
export const deleteTaxonomyRequestSchema = z.object({ id: idSchema })

export type CreateTaxonomyRequest = z.infer<typeof createTaxonomyRequestSchema>
export type RenameTaxonomyRequest = z.infer<typeof renameTaxonomyRequestSchema>
export type DeleteTaxonomyRequest = z.infer<typeof deleteTaxonomyRequestSchema>

// Admins maintain three lists with identical actions. Each endpoint keeps its
// own literal path so routes stay one-action-per-request.
export const createCategoryContract = {
  method: "POST" as const,
  path: "/taxonomy/create-category" as const,
  request: createTaxonomyRequestSchema,
  response: taxonomyItemSchema,
}
export const renameCategoryContract = {
  method: "POST" as const,
  path: "/taxonomy/rename-category" as const,
  request: renameTaxonomyRequestSchema,
  response: taxonomyItemSchema,
}
export const deleteCategoryContract = {
  method: "POST" as const,
  path: "/taxonomy/delete-category" as const,
  request: deleteTaxonomyRequestSchema,
  response: z.object({}),
}

export const createKeywordContract = {
  method: "POST" as const,
  path: "/taxonomy/create-keyword" as const,
  request: createTaxonomyRequestSchema,
  response: taxonomyItemSchema,
}
export const renameKeywordContract = {
  method: "POST" as const,
  path: "/taxonomy/rename-keyword" as const,
  request: renameTaxonomyRequestSchema,
  response: taxonomyItemSchema,
}
export const deleteKeywordContract = {
  method: "POST" as const,
  path: "/taxonomy/delete-keyword" as const,
  request: deleteTaxonomyRequestSchema,
  response: z.object({}),
}

export const createProgramContract = {
  method: "POST" as const,
  path: "/taxonomy/create-program" as const,
  request: createTaxonomyRequestSchema,
  response: taxonomyItemSchema,
}
export const renameProgramContract = {
  method: "POST" as const,
  path: "/taxonomy/rename-program" as const,
  request: renameTaxonomyRequestSchema,
  response: taxonomyItemSchema,
}
export const deleteProgramContract = {
  method: "POST" as const,
  path: "/taxonomy/delete-program" as const,
  request: deleteTaxonomyRequestSchema,
  response: z.object({}),
}

export const listKeywordsContract = {
  method: "GET" as const,
  path: "/taxonomy/list-keywords" as const,
  response: z.array(taxonomyItemSchema),
}

export type ListKeywordsResponse = z.infer<typeof listKeywordsContract.response>
