import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

/** Append-only: a database trigger rejects UPDATE and DELETE. */
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurredAt: timestamp('occurred_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  actorAccountId: uuid('actor_account_id').references(() => accounts.id),
  action: varchar('action', { length: 100 }).notNull(),
  subjectType: varchar('subject_type', { length: 100 }).notNull(),
  subjectId: uuid('subject_id').notNull(),
  details: jsonb('details'),
});
