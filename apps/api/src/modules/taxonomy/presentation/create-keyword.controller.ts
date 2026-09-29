import { Body, Controller, Post } from "@nestjs/common"
import {
  createKeywordContract,
  type CreateTaxonomyRequest,
  type TaxonomyItem,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { CreateKeywordUseCase } from "../application/create-keyword.use-case"

@Controller()
export class CreateKeywordController {
  constructor(private readonly useCase: CreateKeywordUseCase) {}

  @AdminOnly()
  @Post(createKeywordContract.path)
  handle(
    @Body(new ZodValidationPipe(createKeywordContract.request)) body: CreateTaxonomyRequest
  ): Promise<TaxonomyItem> {
    return this.useCase.execute(body)
  }
}
