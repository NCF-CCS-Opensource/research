import { Controller, Get, UnauthorizedException } from "@nestjs/common"
import {
  getCurrentAccountContract,
  type CurrentAccountResponse,
} from "@repo/contracts"
import {
  CurrentIdentity,
  type RequestIdentity,
} from "../../../common/decorators/current-identity.decorator"
import { Public } from "../../../common/decorators/public.decorator"
import {
  GetCurrentAccountUseCase,
} from "../application/get-current-account.use-case"

@Controller()
export class GetCurrentAccountController {
  constructor(private readonly useCase: GetCurrentAccountUseCase) {}

  @Public()
  @Get(getCurrentAccountContract.path)
  async handle(
    @CurrentIdentity() identity: RequestIdentity
  ): Promise<CurrentAccountResponse> {
    if (identity.state === "guest") {
      throw new UnauthorizedException("Authentication required")
    }
    return this.useCase.execute(identity)
  }
}
