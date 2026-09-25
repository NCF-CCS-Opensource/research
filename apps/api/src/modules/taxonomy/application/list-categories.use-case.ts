import { Inject, Injectable } from "@nestjs/common"
import {
  CATEGORY_QUERY,
  type CategoryDto,
  type CategoryQuery,
} from "./category-query.interface"

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_QUERY) private readonly categoryQuery: CategoryQuery
  ) {}

  async execute(): Promise<CategoryDto[]> {
    return this.categoryQuery.list()
  }
}
