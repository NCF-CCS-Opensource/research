import { Body, Controller, Post } from "@nestjs/common"
import {
  renameCategoryContract,
  type RenameTaxonomyRequest,
  type TaxonomyItem,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { RenameCategoryUseCase } from "../application/rename-category.use-case"

@Controller()
export class RenameCategoryController {
  constructor(private readonly useCase: RenameCategoryUseCase) {}

  @AdminOnly()
  @Post(renameCategoryContract.path)
  handle(
    @Body(new ZodValidationPipe(renameCategoryContract.request)) body: RenameTaxonomyRequest
  ): Promise<TaxonomyItem> {
    return this.useCase.execute(body)
  }
}
