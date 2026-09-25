import { Inject, Injectable } from "@nestjs/common"
import type { Category } from "@repo/contracts"
import { asc } from "drizzle-orm"
import type { Database } from "../../../database/database"
import { DATABASE_CONNECTION } from "../../../database/database.module"
import { categories } from "../../../database/schema"
import type { CategoryQuery } from "../application/category-query.interface"

@Injectable()
export class DrizzleCategoryQuery implements CategoryQuery {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database
  ) {}

  async list(): Promise<Category[]> {
    const rows = await this.db
      .select({
        id: categories.id,
        name: categories.name,
      })
      .from(categories)
      .orderBy(asc(categories.name))

    return rows
  }
}
