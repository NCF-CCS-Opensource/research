import { pgTable, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './accounts.js';

export const depositNotices = pgTable('deposit_notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: serial('version').notNull().unique(),
  text: text('text').notNull(),
  publishedBy: uuid('published_by')
    .notNull()
    .references(() => accounts.id),
  publishedAt: timestamp('published_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
