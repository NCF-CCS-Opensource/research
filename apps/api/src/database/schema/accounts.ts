import { sql } from 'drizzle-orm';
import {
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { programs } from './programs.js';

export const roleEnum = pgEnum('role', [
  'STUDENT',
  'INSTRUCTOR',
  'COORDINATOR',
]);
export const accountStatusEnum = pgEnum('account_status', [
  'ACTIVE',
  'DEACTIVATED',
]);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    role: roleEnum('role').notNull(),
    status: accountStatusEnum('status').notNull().default('ACTIVE'),
    programId: uuid('program_id').references(() => programs.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('accounts_email_lower_unique').on(sql`lower(${t.email})`),
  ],
);
