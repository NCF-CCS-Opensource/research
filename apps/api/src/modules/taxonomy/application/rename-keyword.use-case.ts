import { Inject, Injectable } from "@nestjs/common"
import type { RenameTaxonomyRequest, TaxonomyItem } from "@repo/contracts"
import {
  KEYWORD_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class RenameKeywordUseCase {
  constructor(
    @Inject(KEYWORD_REPOSITORY) private readonly keywords: TaxonomyRepository
  ) {}

  execute(input: RenameTaxonomyRequest): Promise<TaxonomyItem> {
    return this.keywords.rename(input.id, input.name)
  }
}
