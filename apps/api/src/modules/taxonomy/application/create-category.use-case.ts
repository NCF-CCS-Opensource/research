import { Inject, Injectable } from "@nestjs/common"
import type { CreateTaxonomyRequest, TaxonomyItem } from "@repo/contracts"
import {
  CATEGORY_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categorys: TaxonomyRepository
  ) {}

  execute(input: CreateTaxonomyRequest): Promise<TaxonomyItem> {
    return this.categorys.create(input.name)
  }
}
