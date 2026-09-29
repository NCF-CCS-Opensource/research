import { Inject, Injectable } from "@nestjs/common"
import type { RenameTaxonomyRequest, TaxonomyItem } from "@repo/contracts"
import {
  CATEGORY_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class RenameCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categorys: TaxonomyRepository
  ) {}

  execute(input: RenameTaxonomyRequest): Promise<TaxonomyItem> {
    return this.categorys.rename(input.id, input.name)
  }
}
