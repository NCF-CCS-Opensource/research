import { Inject, Injectable } from "@nestjs/common"
import type {
  RequestIdentity,
} from "../../../common/decorators/current-identity.decorator"
import {
  PROFILE_REPOSITORY,
  type ProfileRepository,
} from "./profile-repository.interface"
import { TOKEN_VERIFIER, type TokenVerifier } from "./token-verifier.interface"

@Injectable()
export class ResolveRequestIdentityUseCase {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository
  ) {}

  async execute(token: string | null): Promise<RequestIdentity> {
    if (!token) {
      return { state: "guest" }
    }

    const verified = await this.tokenVerifier.verify(token)
    if (!verified) {
      return { state: "guest" }
    }

    const profile = await this.profiles.findByClerkUserId(
      verified.clerkUserId
    )
    if (!profile) {
      return {
        state: "registering",
        clerkUserId: verified.clerkUserId,
        email: verified.email,
      }
    }

    if (profile.email !== verified.email) {
      await this.profiles.updateEmail(profile.id, verified.email)
    }

    return {
      state: profile.status,
      profileId: profile.id,
      clerkUserId: profile.clerkUserId,
      email: verified.email,
      role: profile.role,
    }
  }
}
