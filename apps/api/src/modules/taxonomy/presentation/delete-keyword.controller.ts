import { Body, Controller, Post } from "@nestjs/common"
import {
  deleteKeywordContract,
  type DeleteTaxonomyRequest,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { DeleteKeywordUseCase } from "../application/delete-keyword.use-case"

@Controller()
export class DeleteKeywordController {
  constructor(private readonly useCase: DeleteKeywordUseCase) {}

  @AdminOnly()
  @Post(deleteKeywordContract.path)
  handle(
    @Body(new ZodValidationPipe(deleteKeywordContract.request)) body: DeleteTaxonomyRequest
  ): Promise<Record<string, never>> {
    return this.useCase.execute(body)
  }
}
