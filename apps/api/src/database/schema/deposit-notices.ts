import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"

export const depositNotices = pgTable("deposit_notices", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: serial("version").notNull().unique(),
  text: text("text").notNull(),
  publishedBy: uuid("published_by").notNull().references(() => profiles.id),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
})
