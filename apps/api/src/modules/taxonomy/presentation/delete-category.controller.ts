import { Body, Controller, Post } from "@nestjs/common"
import {
  deleteCategoryContract,
  type DeleteTaxonomyRequest,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { DeleteCategoryUseCase } from "../application/delete-category.use-case"

@Controller()
export class DeleteCategoryController {
  constructor(private readonly useCase: DeleteCategoryUseCase) {}

  @AdminOnly()
  @Post(deleteCategoryContract.path)
  handle(
    @Body(new ZodValidationPipe(deleteCategoryContract.request)) body: DeleteTaxonomyRequest
  ): Promise<Record<string, never>> {
    return this.useCase.execute(body)
  }
}
