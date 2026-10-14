import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { papers } from './papers.js';

export const paperDecisions = pgTable('paper_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: uuid('paper_id')
    .notNull()
    .references(() => papers.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => accounts.id),
  decision: varchar('decision', { length: 40 }).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const depositAcknowledgements = pgTable('deposit_acknowledgements', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: uuid('paper_id')
    .notNull()
    .references(() => papers.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  noticeVersion: integer('notice_version').notNull(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
