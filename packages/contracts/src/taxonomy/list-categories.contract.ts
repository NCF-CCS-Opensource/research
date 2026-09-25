import { z } from "zod"

export const categorySchema = z.object({
  id: z.string().uuid({ message: "Invalid category ID" }),
  name: z.string().min(1, { message: "Category name is required" }),
})

export type Category = z.infer<typeof categorySchema>

export const listCategoriesContract = {
  method: "GET" as const,
  path: "/taxonomy/list-categories" as const,
  response: z.array(categorySchema),
}

export type ListCategoriesResponse = z.infer<
  typeof listCategoriesContract.response
>
