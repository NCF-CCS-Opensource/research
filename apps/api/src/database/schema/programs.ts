import { boolean, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const programs = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  active: boolean('active').notNull().default(true),
});
