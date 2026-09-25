import { DomainError } from "../../../common/errors/domain.error"

export class CategoryNotFoundError extends DomainError {
  constructor(id: string) {
    super("CATEGORY_NOT_FOUND", `Category with id ${id} not found`, 404)
  }
}
