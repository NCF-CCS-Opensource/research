import { pgTable, text, integer, smallint } from "drizzle-orm/pg-core"

export const settings = pgTable("settings", {
  id: smallint("id").primaryKey().default(1),
  defaultAccessGrantDays: integer("default_access_grant_days").notNull().default(7),
  maximumAccessGrantDays: integer("maximum_access_grant_days").notNull().default(30),
  pendingRequestDays: integer("pending_request_days").notNull().default(14),
  institutionName: text("institution_name").notNull().default("Naga College Foundation"),
})

export type SettingsRow = typeof settings.$inferSelect
