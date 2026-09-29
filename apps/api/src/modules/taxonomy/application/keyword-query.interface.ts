import type { TaxonomyItem } from "@repo/contracts"

export const KEYWORD_QUERY = Symbol("KEYWORD_QUERY")

export interface KeywordQuery {
  list(): Promise<TaxonomyItem[]>
}
