import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from "@nestjs/common"
import {
  updateProfileContract,
  type RegisterResponse,
  type UpdateProfileRequest,
} from "@repo/contracts"
import {
  CurrentIdentity,
  type RequestIdentity,
} from "../../../common/decorators/current-identity.decorator"
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe"
import { UpdateProfileUseCase } from "../application/update-profile.use-case"

@Controller()
export class UpdateProfileController {
  constructor(private readonly useCase: UpdateProfileUseCase) {}

  @Post(updateProfileContract.path)
  async handle(
    @CurrentIdentity() identity: RequestIdentity,
    @Body(new ZodValidationPipe(updateProfileContract.request))
    body: UpdateProfileRequest
  ): Promise<RegisterResponse> {
    if (identity.state !== "active") {
      throw new UnauthorizedException("Authentication required")
    }
    return this.useCase.execute({ ...body, profileId: identity.profileId })
  }
}
