import { sql } from "drizzle-orm"
import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (t) => [uniqueIndex("categories_name_lower_idx").on(sql`lower(${t.name})`)]
)

export type CategoryRow = typeof categories.$inferSelect
export type NewCategoryRow = typeof categories.$inferInsert
