import { DomainError } from "../../../common/errors/domain.error"

export type TaxonomyLabel = "Category" | "Keyword" | "Program"

export class DuplicateTaxonomyNameError extends DomainError {
  constructor(label: TaxonomyLabel, name: string) {
    super(
      "DUPLICATE_TAXONOMY_NAME",
      `A ${label} named "${name}" already exists.`,
      409
    )
  }
}

export class TaxonomyEntryNotFoundError extends DomainError {
  constructor(label: TaxonomyLabel) {
    super(
      "TAXONOMY_ENTRY_NOT_FOUND",
      `That ${label} no longer exists. Refresh and try again.`,
      404
    )
  }
}
