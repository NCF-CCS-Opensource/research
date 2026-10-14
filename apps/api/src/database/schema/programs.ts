import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core"

export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
})

export type ProgramRow = typeof programs.$inferSelect
export type NewProgramRow = typeof programs.$inferInsert
