import { pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core"
import { programs } from "./programs"

export const accountRoleEnum = pgEnum("account_role", ["user", "admin"])
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "suspended",
])

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  programId: uuid("program_id").references(() => programs.id),
  role: accountRoleEnum("role").notNull().default("user"),
  status: accountStatusEnum("status").notNull().default("active"),
})

export type ProfileRow = typeof profiles.$inferSelect
export type NewProfileRow = typeof profiles.$inferInsert
