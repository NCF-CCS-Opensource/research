import { Inject, Injectable } from "@nestjs/common"
import type { Program } from "@repo/contracts"
import { asc, eq } from "drizzle-orm"
import type { Database } from "../../../database/database"
import { DATABASE_CONNECTION } from "../../../database/database.module"
import { programs } from "../../../database/schema"
import type { ProgramQuery } from "../application/program-query.interface"

@Injectable()
export class DrizzleProgramQuery implements ProgramQuery {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async list(): Promise<Program[]> {
    const rows = await this.db
      .select({
        id: programs.id,
        name: programs.name,
      })
      .from(programs)
      .where(eq(programs.isActive, true))
      .orderBy(asc(programs.name))

    return rows
  }
}
