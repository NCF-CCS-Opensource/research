import type { Profile } from "../domain/profile.entity"

export const PROFILE_REPOSITORY = Symbol("PROFILE_REPOSITORY")

export interface ProfileRepository {
  findByClerkUserId(clerkUserId: string): Promise<Profile | null>
  save(profile: Profile): Promise<void>
  updateEmail(profileId: string, email: string): Promise<void>
}
