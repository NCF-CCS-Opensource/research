import { Inject, Injectable } from "@nestjs/common"
import type { TaxonomyItem } from "@repo/contracts"
import { asc } from "drizzle-orm"
import type { Database } from "../../../database/database"
import { DATABASE_CONNECTION } from "../../../database/database.module"
import { keywords } from "../../../database/schema"
import type { KeywordQuery } from "../application/keyword-query.interface"

@Injectable()
export class DrizzleKeywordQuery implements KeywordQuery {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async list(): Promise<TaxonomyItem[]> {
    return this.db
      .select({ id: keywords.id, name: keywords.name })
      .from(keywords)
      .orderBy(asc(keywords.name))
  }
}
