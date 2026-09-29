import { Inject, Injectable } from "@nestjs/common"
import type { RenameTaxonomyRequest, TaxonomyItem } from "@repo/contracts"
import {
  PROGRAM_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class RenameProgramUseCase {
  constructor(
    @Inject(PROGRAM_REPOSITORY) private readonly programs: TaxonomyRepository
  ) {}

  execute(input: RenameTaxonomyRequest): Promise<TaxonomyItem> {
    return this.programs.rename(input.id, input.name)
  }
}
