import { DomainError } from "../../../common/errors/domain.error"

export class InvalidCategoryNameError extends DomainError {
  constructor() {
    super("INVALID_CATEGORY_NAME", "Category name cannot be empty", 400)
  }
}
