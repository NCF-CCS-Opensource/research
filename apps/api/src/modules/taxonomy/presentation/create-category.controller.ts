import { Body, Controller, Post } from "@nestjs/common"
import {
  createCategoryContract,
  type CreateTaxonomyRequest,
  type TaxonomyItem,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { CreateCategoryUseCase } from "../application/create-category.use-case"

@Controller()
export class CreateCategoryController {
  constructor(private readonly useCase: CreateCategoryUseCase) {}

  @AdminOnly()
  @Post(createCategoryContract.path)
  handle(
    @Body(new ZodValidationPipe(createCategoryContract.request)) body: CreateTaxonomyRequest
  ): Promise<TaxonomyItem> {
    return this.useCase.execute(body)
  }
}
