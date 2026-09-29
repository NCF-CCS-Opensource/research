import { Inject, Injectable } from "@nestjs/common"
import type { CreateTaxonomyRequest, TaxonomyItem } from "@repo/contracts"
import {
  PROGRAM_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class CreateProgramUseCase {
  constructor(
    @Inject(PROGRAM_REPOSITORY) private readonly programs: TaxonomyRepository
  ) {}

  execute(input: CreateTaxonomyRequest): Promise<TaxonomyItem> {
    return this.programs.create(input.name)
  }
}
