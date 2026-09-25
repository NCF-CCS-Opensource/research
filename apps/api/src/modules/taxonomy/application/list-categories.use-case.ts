import { Inject, Injectable } from "@nestjs/common"
import type { Category } from "@repo/contracts"
import {
  CATEGORY_QUERY,
  type CategoryQuery,
} from "./category-query.interface"

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_QUERY) private readonly categoryQuery: CategoryQuery
  ) {}

  async execute(): Promise<Category[]> {
    return this.categoryQuery.list()
  }
}
