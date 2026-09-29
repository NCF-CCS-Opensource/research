import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from "@nestjs/common"
import {
  changeUserRoleContract,
  type ChangeUserRoleRequest,
  type UserSummary,
} from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import {
  CurrentIdentity,
  type RequestIdentity,
} from "../../../common/decorators/current-identity.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import {
  ChangeUserRoleUseCase,
} from "../application/change-user-role.use-case"

@Controller()
export class ChangeUserRoleController {
  constructor(private readonly useCase: ChangeUserRoleUseCase) {}

  @AdminOnly()
  @Post(changeUserRoleContract.path)
  async handle(
    @CurrentIdentity() identity: RequestIdentity,
    @Body(new ZodValidationPipe(changeUserRoleContract.request))
    body: ChangeUserRoleRequest
  ): Promise<UserSummary> {
    if (identity.state !== "active") {
      throw new UnauthorizedException("Authentication required")
    }
    return this.useCase.execute({ ...body, actorProfileId: identity.profileId })
  }
}
