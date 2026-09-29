import { sql } from "drizzle-orm"
import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"

// Research Record links must reference keywords.id with ON DELETE CASCADE so
// deleting a Keyword removes it from every Research Record.
export const keywords = pgTable(
  "keywords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (t) => [uniqueIndex("keywords_name_lower_idx").on(sql`lower(${t.name})`)]
)

export type KeywordRow = typeof keywords.$inferSelect
export type NewKeywordRow = typeof keywords.$inferInsert
