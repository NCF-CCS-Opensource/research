import type { TaxonomyItem } from "@repo/contracts"

export const CATEGORY_REPOSITORY = Symbol("CATEGORY_REPOSITORY")
export const KEYWORD_REPOSITORY = Symbol("KEYWORD_REPOSITORY")
export const PROGRAM_REPOSITORY = Symbol("PROGRAM_REPOSITORY")

/**
 * Writes for one Admin-maintained list. Names are unique ignoring case.
 * Deleting an entry also unlinks it from whatever referenced it.
 */
export interface TaxonomyRepository {
  create(name: string): Promise<TaxonomyItem>
  rename(id: string, name: string): Promise<TaxonomyItem>
  delete(id: string): Promise<void>
}
