import type { Category } from "@repo/contracts"

export const CATEGORY_QUERY = Symbol("CATEGORY_QUERY")

export interface CategoryQuery {
  list(): Promise<Category[]>
}
