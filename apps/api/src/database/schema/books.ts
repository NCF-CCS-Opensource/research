import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicId: varchar('public_id', { length: 32 }).notNull().unique(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => accounts.id),
  title: varchar('title', { length: 300 }).notNull(),
  authors: jsonb('authors').notNull(),
  year: integer('year').notNull(),
  licence: varchar('licence', { length: 100 }).notNull(),
  sourceUrl: text('source_url'),
  publisher: varchar('publisher', { length: 255 }),
  edition: varchar('edition', { length: 100 }),
  isbn: varchar('isbn', { length: 32 }),
  description: text('description'),
  keywords: text('keywords').array().notNull(),
  objectKey: text('object_key').notNull().unique(),
  filename: varchar('filename', { length: 255 }).notNull(),
  byteCount: integer('byte_count').notNull(),
  sha256: varchar('sha256', { length: 64 }).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
