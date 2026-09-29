import { Inject, Injectable } from "@nestjs/common"
import type { CreateTaxonomyRequest, TaxonomyItem } from "@repo/contracts"
import {
  KEYWORD_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class CreateKeywordUseCase {
  constructor(
    @Inject(KEYWORD_REPOSITORY) private readonly keywords: TaxonomyRepository
  ) {}

  execute(input: CreateTaxonomyRequest): Promise<TaxonomyItem> {
    return this.keywords.create(input.name)
  }
}
