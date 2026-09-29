import { sql } from "drizzle-orm"
import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
  },
  (t) => [uniqueIndex("programs_name_lower_idx").on(sql`lower(${t.name})`)]
)

export type ProgramRow = typeof programs.$inferSelect
export type NewProgramRow = typeof programs.$inferInsert
