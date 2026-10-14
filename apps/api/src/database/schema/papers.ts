import {
  boolean,
  customType,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts.js';
import { programs } from './programs.js';
import { RESEARCH_TYPE_VALUES } from '@repo/contracts';

export const paperStatusEnum = pgEnum('paper_status', [
  'draft',
  'submitted',
  'endorsed',
  'revision_requested',
  'rejected',
]);
export const paperPublicationStatusEnum = pgEnum('paper_publication_status', [
  'unpublished',
  'published',
  'withdrawn',
]);
export const researchTypeEnum = pgEnum('research_type', RESEARCH_TYPE_VALUES);
const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

export const papers = pgTable('papers', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicId: varchar('public_id', { length: 32 }).notNull().unique(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => accounts.id),
  adviserId: uuid('adviser_id').references(() => accounts.id),
  legacyDeposit: boolean('legacy_deposit').notNull().default(false),
  programId: uuid('program_id')
    .notNull()
    .references(() => programs.id),
  status: paperStatusEnum('status').notNull().default('draft'),
  publicationStatus: paperPublicationStatusEnum('publication_status')
    .notNull()
    .default('unpublished'),
  withdrawalReason: text('withdrawal_reason'),
  publicWithdrawalNotice: text('public_withdrawal_notice'),
  currentVersionId: uuid('current_version_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paperVersions = pgTable('paper_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paperId: uuid('paper_id')
    .notNull()
    .references(() => papers.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  lockVersion: integer('lock_version').notNull().default(0),
  title: varchar('title', { length: 300 }).notNull(),
  abstract: text('abstract').notNull(),
  year: integer('year').notNull(),
  researchType: researchTypeEnum('research_type').notNull(),
  keywords: text('keywords').array().notNull(),
  authors: jsonb('authors').notNull(),
  searchDocument: tsvector('search_document')
    .notNull()
    .default(sql`''::tsvector`),
  pdfFileId: uuid('pdf_file_id'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PaperRow = typeof papers.$inferSelect;
export type PaperVersionRow = typeof paperVersions.$inferSelect;
