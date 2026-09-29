import { Inject, Injectable } from "@nestjs/common"
import type { DeleteTaxonomyRequest } from "@repo/contracts"
import {
  PROGRAM_REPOSITORY,
  type TaxonomyRepository,
} from "./taxonomy-repository.interface"

@Injectable()
export class DeleteProgramUseCase {
  constructor(
    @Inject(PROGRAM_REPOSITORY) private readonly programs: TaxonomyRepository
  ) {}

  execute(input: DeleteTaxonomyRequest): Promise<Record<string, never>> {
    return this.programs.delete(input.id).then(() => ({}))
  }
}
