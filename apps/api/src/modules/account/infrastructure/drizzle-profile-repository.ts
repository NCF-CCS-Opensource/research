import { Inject, Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"
import type { Database } from "../../../database/database"
import { DATABASE_CONNECTION } from "../../../database/database.module"
import { profiles, type ProfileRow } from "../../../database/schema"
import type {
  ProfileRepository,
} from "../application/profile-repository.interface"
import { Profile } from "../domain/profile.entity"
import { ProfileAlreadyExistsError } from "../domain/profile.errors"

@Injectable()
export class DrizzleProfileRepository implements ProfileRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findByClerkUserId(clerkUserId: string): Promise<Profile | null> {
    const [row] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.clerkUserId, clerkUserId))
      .limit(1)

    return row ? toDomain(row) : null
  }

  async save(profile: Profile): Promise<void> {
    try {
      await this.db.insert(profiles).values({
        id: profile.id,
        clerkUserId: profile.clerkUserId,
        fullName: profile.fullName,
        email: profile.email,
        programId: profile.programId,
        role: profile.role,
        status: profile.status,
      })
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ProfileAlreadyExistsError()
      }
      throw err
    }
  }

  async updateEmail(profileId: string, email: string): Promise<void> {
    await this.db
      .update(profiles)
      .set({ email })
      .where(eq(profiles.id, profileId))
  }
}

function toDomain(row: ProfileRow): Profile {
  return Profile.fromProperties({
    id: row.id,
    clerkUserId: row.clerkUserId,
    fullName: row.fullName,
    email: row.email,
    programId: row.programId,
    role: row.role,
    status: row.status,
  })
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  )
}
