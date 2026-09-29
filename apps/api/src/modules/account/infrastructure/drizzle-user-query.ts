import { Inject, Injectable } from "@nestjs/common"
import type { UserSummary } from "@repo/contracts"
import { asc, eq } from "drizzle-orm"
import type { Database } from "../../../database/database"
import { DATABASE_CONNECTION } from "../../../database/database.module"
import { profiles, programs } from "../../../database/schema"
import type { UserQuery } from "../application/user-query.interface"

@Injectable()
export class DrizzleUserQuery implements UserQuery {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  list(): Promise<UserSummary[]> {
    return this.select().orderBy(asc(profiles.fullName), asc(profiles.id))
  }

  async findById(profileId: string): Promise<UserSummary | null> {
    const [row] = await this.select().where(eq(profiles.id, profileId))
    return row ?? null
  }

  private select() {
    return this.db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        programId: profiles.programId,
        programName: programs.name,
        role: profiles.role,
        status: profiles.status,
      })
      .from(profiles)
      .leftJoin(programs, eq(profiles.programId, programs.id))
  }
}
