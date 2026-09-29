import { Body, Controller, Post } from "@nestjs/common"
import {
  createProgramContract,
  type CreateTaxonomyRequest,
  type TaxonomyItem,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { CreateProgramUseCase } from "../application/create-program.use-case"

@Controller()
export class CreateProgramController {
  constructor(private readonly useCase: CreateProgramUseCase) {}

  @AdminOnly()
  @Post(createProgramContract.path)
  handle(
    @Body(new ZodValidationPipe(createProgramContract.request)) body: CreateTaxonomyRequest
  ): Promise<TaxonomyItem> {
    return this.useCase.execute(body)
  }
}
