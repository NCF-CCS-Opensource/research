import { Inject, Injectable } from "@nestjs/common"
import type { UserSummary } from "@repo/contracts"
import { USER_QUERY, type UserQuery } from "./user-query.interface"

@Injectable()
export class ListUsersUseCase {
  constructor(@Inject(USER_QUERY) private readonly users: UserQuery) {}

  execute(): Promise<UserSummary[]> {
    return this.users.list()
  }
}
