import { Inject, Injectable } from "@nestjs/common"
import type { RegisterResponse } from "@repo/contracts"
import {
  ListProgramsUseCase,
} from "../../taxonomy/application/list-programs.use-case"
import { Profile } from "../domain/profile.entity"
import {
  ProfileAlreadyExistsError,
  ProgramNotFoundError,
} from "../domain/profile.errors"
import {
  PROFILE_REPOSITORY,
  type ProfileRepository,
} from "./profile-repository.interface"

export interface RegisterInput {
  clerkUserId: string
  email: string
  fullName: string
  programId?: string
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
    private readonly listPrograms: ListProgramsUseCase
  ) {}

  async execute(input: RegisterInput): Promise<RegisterResponse> {
    const existing = await this.profiles.findByClerkUserId(input.clerkUserId)
    if (existing) {
      throw new ProfileAlreadyExistsError()
    }

    const programId = input.programId ?? null
    if (programId) {
      const programs = await this.listPrograms.execute()
      if (!programs.some((program) => program.id === programId)) {
        throw new ProgramNotFoundError()
      }
    }

    const profile = Profile.register({
      clerkUserId: input.clerkUserId,
      fullName: input.fullName,
      email: input.email,
      programId,
    })

    await this.profiles.save(profile)

    return {
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      programId: profile.programId,
      role: profile.role,
      status: profile.status,
    }
  }
}
