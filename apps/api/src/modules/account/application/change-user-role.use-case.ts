import { Inject, Injectable } from "@nestjs/common"
import type { ChangeUserRoleRequest, UserSummary } from "@repo/contracts"
import {
  CannotChangeOwnAccountError,
  ProfileNotFoundError,
} from "../domain/profile.errors"
import {
  PROFILE_REPOSITORY,
  type ProfileRepository,
} from "./profile-repository.interface"
import { USER_QUERY, type UserQuery } from "./user-query.interface"

export interface ChangeUserRoleInput extends ChangeUserRoleRequest {
  actorProfileId: string
}

@Injectable()
export class ChangeUserRoleUseCase {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
    @Inject(USER_QUERY) private readonly users: UserQuery
  ) {}

  async execute(input: ChangeUserRoleInput): Promise<UserSummary> {
    if (input.profileId === input.actorProfileId) {
      throw new CannotChangeOwnAccountError()
    }
    const profile = await this.profiles.findById(input.profileId)
    if (!profile) {
      throw new ProfileNotFoundError()
    }

    await this.profiles.update(profile.withRole(input.role))

    const summary = await this.users.findById(input.profileId)
    if (!summary) {
      throw new ProfileNotFoundError()
    }
    return summary
  }
}
