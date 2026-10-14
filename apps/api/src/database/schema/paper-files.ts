import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { papers, paperVersions } from './papers.js';
import { accounts } from './accounts.js';

export const paperFileStatusEnum = pgEnum('paper_file_status', [
  'PENDING',
  'CLEAN',
  'REJECTED',
  'FAILED',
]);
export const paperFiles = pgTable('paper_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: uuid('paper_id').references(() => papers.id, {
    onDelete: 'set null',
  }),
  versionId: uuid('version_id').references(() => paperVersions.id, {
    onDelete: 'set null',
  }),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => accounts.id),
  objectKey: varchar('object_key', { length: 100 }).notNull().unique(),
  filename: varchar('filename', { length: 255 }).notNull(),
  byteCount: integer('byte_count').notNull(),
  sha256: varchar('sha256', { length: 64 }).notNull(),
  status: paperFileStatusEnum('status').notNull().default('PENDING'),
  reason: varchar('reason', { length: 40 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paperFileJobs = pgTable('paper_file_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id')
    .notNull()
    .unique()
    .references(() => paperFiles.id, { onDelete: 'cascade' }),
  attempts: integer('attempts').notNull().default(0),
  availableAt: timestamp('available_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  leaseUntil: timestamp('lease_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paperFileUploadAttempts = pgTable('paper_file_upload_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
