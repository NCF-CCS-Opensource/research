import { Controller, Get } from "@nestjs/common"
import {
  getCurrentAccountContract,
  type CurrentAccountResponse,
} from "@repo/contracts"
import {
  CurrentIdentity,
} from "../../../common/decorators/current-identity.decorator"
import { Public } from "../../../common/decorators/public.decorator"
import {
  GetCurrentAccountUseCase,
} from "../application/get-current-account.use-case"
import type { RequestIdentity } from "../application/request-identity"

@Controller()
export class GetCurrentAccountController {
  constructor(private readonly useCase: GetCurrentAccountUseCase) {}

  @Public()
  @Get(getCurrentAccountContract.path)
  async handle(
    @CurrentIdentity() identity: RequestIdentity
  ): Promise<CurrentAccountResponse> {
    return this.useCase.execute(identity)
  }
}
