import { Inject, Injectable } from "@nestjs/common"
import type { RegisterResponse, UpdateProfileRequest } from "@repo/contracts"
import {
  ListProgramsUseCase,
} from "../../taxonomy/application/list-programs.use-case"
import {
  ProfileNotFoundError,
  ProgramNotFoundError,
} from "../domain/profile.errors"
import {
  PROFILE_REPOSITORY,
  type ProfileRepository,
} from "./profile-repository.interface"

export interface UpdateProfileInput extends UpdateProfileRequest {
  profileId: string
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
    private readonly listPrograms: ListProgramsUseCase
  ) {}

  async execute(input: UpdateProfileInput): Promise<RegisterResponse> {
    const profile = await this.profiles.findById(input.profileId)
    if (!profile) {
      throw new ProfileNotFoundError()
    }

    const programId = input.programId ?? null
    if (programId) {
      const programs = await this.listPrograms.execute()
      if (!programs.some((program) => program.id === programId)) {
        throw new ProgramNotFoundError()
      }
    }

    const updated = profile.withDetails(input.fullName, programId)
    await this.profiles.update(updated)

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      programId: updated.programId,
      role: updated.role,
      status: updated.status,
    }
  }
}
