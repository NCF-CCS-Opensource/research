import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';
import { paperVersions, papers } from './papers.js';

export const accessRequestStatusEnum = pgEnum('access_request_status', [
  'pending',
  'approved',
  'denied',
  'cancelled',
  'expired',
]);

export const accessRequests = pgTable(
  'access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    paperId: uuid('paper_id')
      .notNull()
      .references(() => papers.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    purpose: text('purpose').notNull(),
    status: accessRequestStatusEnum('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    decidedBy: uuid('decided_by').references(() => accounts.id),
    decisionReason: text('decision_reason'),
    grantExpiresAt: timestamp('grant_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('access_requests_pending_unique')
      .on(t.accountId, t.paperId)
      .where(sql`${t.status} = 'pending'`),
    index('access_requests_account_created_idx').on(t.accountId, t.createdAt),
    index('access_requests_paper_created_idx').on(t.paperId, t.createdAt),
  ],
);

export const accessGrants = pgTable(
  'access_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .unique()
      .references(() => accessRequests.id),
    paperId: uuid('paper_id')
      .notNull()
      .references(() => papers.id, { onDelete: 'cascade' }),
    versionId: uuid('version_id')
      .notNull()
      .references(() => paperVersions.id),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revocationReason: text('revocation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('access_grants_account_paper_idx').on(
      t.accountId,
      t.paperId,
      t.expiresAt,
    ),
  ],
);
