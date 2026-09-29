import { Inject, Injectable } from "@nestjs/common"
import type { DeleteTaxonomyRequest } from "@repo/contracts"
import {
  CATEGORY_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categorys: TaxonomyRepository
  ) {}

  execute(input: DeleteTaxonomyRequest): Promise<Record<string, never>> {
    return this.categorys.delete(input.id).then(() => ({}))
  }
}
