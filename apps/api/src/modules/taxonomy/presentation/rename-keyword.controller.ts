import { Body, Controller, Post } from "@nestjs/common"
import {
  renameKeywordContract,
  type RenameTaxonomyRequest,
  type TaxonomyItem,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { RenameKeywordUseCase } from "../application/rename-keyword.use-case"

@Controller()
export class RenameKeywordController {
  constructor(private readonly useCase: RenameKeywordUseCase) {}

  @AdminOnly()
  @Post(renameKeywordContract.path)
  handle(
    @Body(new ZodValidationPipe(renameKeywordContract.request)) body: RenameTaxonomyRequest
  ): Promise<TaxonomyItem> {
    return this.useCase.execute(body)
  }
}
