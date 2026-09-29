import { Body, Controller, Post } from "@nestjs/common"
import {
  deleteProgramContract,
  type DeleteTaxonomyRequest,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { DeleteProgramUseCase } from "../application/delete-program.use-case"

@Controller()
export class DeleteProgramController {
  constructor(private readonly useCase: DeleteProgramUseCase) {}

  @AdminOnly()
  @Post(deleteProgramContract.path)
  handle(
    @Body(new ZodValidationPipe(deleteProgramContract.request)) body: DeleteTaxonomyRequest
  ): Promise<Record<string, never>> {
    return this.useCase.execute(body)
  }
}
