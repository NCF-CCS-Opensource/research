import { Inject, Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"
import type { Database } from "../../../database/database"
import { DATABASE_CONNECTION } from "../../../database/database.module"
import { profiles, type ProfileRow } from "../../../database/schema"
import type {
  ProfileRepository,
} from "../application/profile-repository.interface"
import { Profile } from "../domain/profile.entity"
import {
  EmailAlreadyRegisteredError,
  ProfileAlreadyExistsError,
} from "../domain/profile.errors"

const CLERK_USER_ID_CONSTRAINT = "profiles_clerk_user_id_unique"
const EMAIL_CONSTRAINT = "profiles_email_unique"

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
      if (isUniqueViolation(err, CLERK_USER_ID_CONSTRAINT)) {
        throw new ProfileAlreadyExistsError()
      }
      if (isUniqueViolation(err, EMAIL_CONSTRAINT)) {
        throw new EmailAlreadyRegisteredError()
      }
      throw err
    }
  }

  async updateEmail(profileId: string, email: string): Promise<void> {
    try {
      await this.db
        .update(profiles)
        .set({ email })
        .where(eq(profiles.id, profileId))
    } catch (err) {
      if (isUniqueViolation(err, EMAIL_CONSTRAINT)) {
        throw new EmailAlreadyRegisteredError()
      }
      throw err
    }
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

function isUniqueViolation(err: unknown, constraintName: string): boolean {
  // Drizzle wraps the driver error in DrizzleQueryError; the Postgres error
  // (with .code / .constraint_name) is its `cause`, not the thrown error itself.
  const cause = err instanceof Error ? (err.cause ?? err) : err
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: string }).code === "23505" &&
    (cause as { constraint_name?: string }).constraint_name === constraintName
  )
}
