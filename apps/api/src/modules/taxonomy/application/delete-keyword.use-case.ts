import { Inject, Injectable } from "@nestjs/common"
import type { DeleteTaxonomyRequest } from "@repo/contracts"
import {
  KEYWORD_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class DeleteKeywordUseCase {
  constructor(
    @Inject(KEYWORD_REPOSITORY) private readonly keywords: TaxonomyRepository
  ) {}

  execute(input: DeleteTaxonomyRequest): Promise<Record<string, never>> {
    return this.keywords.delete(input.id).then(() => ({}))
  }
}
