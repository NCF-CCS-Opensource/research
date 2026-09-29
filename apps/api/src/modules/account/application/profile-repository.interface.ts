import type { Profile } from "../domain/profile.entity"

export const PROFILE_REPOSITORY = Symbol("PROFILE_REPOSITORY")

export interface ProfileRepository {
  findById(id: string): Promise<Profile | null>
  findByClerkUserId(clerkUserId: string): Promise<Profile | null>
  save(profile: Profile): Promise<void>
  /** Persists the mutable fields: full name, Program, role, and status. */
  update(profile: Profile): Promise<void>
  updateEmail(profileId: string, email: string): Promise<void>
}
