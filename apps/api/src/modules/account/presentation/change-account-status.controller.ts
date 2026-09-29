import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from "@nestjs/common"
import {
  changeAccountStatusContract,
  type ChangeAccountStatusRequest,
  type UserSummary,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import {
  CurrentIdentity,
  type RequestIdentity,
} from "../../../common/decorators/current-identity.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import {
  ChangeAccountStatusUseCase,
} from "../application/change-account-status.use-case"

@Controller()
export class ChangeAccountStatusController {
  constructor(private readonly useCase: ChangeAccountStatusUseCase) {}

  @AdminOnly()
  @Post(changeAccountStatusContract.path)
  async handle(
    @CurrentIdentity() identity: RequestIdentity,
    @Body(new ZodValidationPipe(changeAccountStatusContract.request))
    body: ChangeAccountStatusRequest
  ): Promise<UserSummary> {
    if (identity.state !== "active") {
      throw new UnauthorizedException("Authentication required")
    }
    return this.useCase.execute({ ...body, actorProfileId: identity.profileId })
  }
}
