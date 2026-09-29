import { Controller, Get } from "@nestjs/common"
import { listUsersContract, type UserSummary } from "@repo/contracts"
import { AdminOnly } from "../../../common/decorators/admin-only.decorator"
import { ListUsersUseCase } from "../application/list-users.use-case"

@Controller()
export class ListUsersController {
  constructor(private readonly useCase: ListUsersUseCase) {}

  @AdminOnly()
  @Get(listUsersContract.path)
  handle(): Promise<UserSummary[]> {
    return this.useCase.execute()
  }
}
