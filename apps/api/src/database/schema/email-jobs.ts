import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const emailJobStatusEnum = pgEnum('email_job_status', [
  'pending',
  'processing',
  'sent',
  'failed',
]);

export const emailJobs = pgTable(
  'email_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    event: varchar('event', { length: 50 }).notNull(),
    recipientEmail: varchar('recipient_email', { length: 320 }).notNull(),
    recipientName: varchar('recipient_name', { length: 255 }).notNull(),
    paperPublicId: varchar('paper_public_id', { length: 32 }),
    bookPublicId: varchar('book_public_id', { length: 32 }),
    paperTitle: varchar('paper_title', { length: 300 }).notNull(),
    details: jsonb('details'),
    status: emailJobStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    lastError: varchar('last_error', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => [index('email_jobs_claim_idx').on(t.status, t.availableAt)],
);
