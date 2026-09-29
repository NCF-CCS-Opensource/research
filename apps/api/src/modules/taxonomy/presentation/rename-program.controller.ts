import { Body, Controller, Post } from "@nestjs/common"
import {
  renameProgramContract,
  type RenameTaxonomyRequest,
  type TaxonomyItem,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { RenameProgramUseCase } from "../application/rename-program.use-case"

@Controller()
export class RenameProgramController {
  constructor(private readonly useCase: RenameProgramUseCase) {}

  @AdminOnly()
  @Post(renameProgramContract.path)
  handle(
    @Body(new ZodValidationPipe(renameProgramContract.request)) body: RenameTaxonomyRequest
  ): Promise<TaxonomyItem> {
    return this.useCase.execute(body)
  }
}
