import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorProfileId: uuid("actor_profile_id").notNull().references(() => profiles.id),
  action: text("action").notNull(),
  entityId: text("entity_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
