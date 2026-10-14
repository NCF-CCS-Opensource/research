import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { validateEnv } from '../src/config/env.js';
import type { Database } from '../src/database/database.js';
import { runMigrations } from '../src/database/migrate.js';
import * as schema from '../src/database/schema/index.js';
import { PaperUseCases } from '../src/modules/paper/paper.use-cases.js';

describe('Paper catalog search (database)', () => {
  const client = postgres(validateEnv().DATABASE_URL, { max: 10 });
  const db: Database = drizzle(client, { schema });
  const useCases = new PaperUseCases(db);
  const accountId = randomUUID();
  const programId = randomUUID();
  const paperId = randomUUID();
  const publicId = randomUUID().replaceAll('-', '');

  beforeAll(async () => {
    await runMigrations();
    await db
      .insert(schema.programs)
      .values({ id: programId, name: `Search test ${programId}` });
    await db.insert(schema.accounts).values({
      id: accountId,
      clerkUserId: `search_${accountId}`,
      name: 'Catalog test account',
      email: `${accountId}@ncf.edu.ph`,
      role: 'STUDENT',
    });
    await db.insert(schema.papers).values({
      id: paperId,
      publicId,
      ownerId: accountId,
      adviserId: accountId,
      programId,
      status: 'endorsed',
      publicationStatus: 'published',
    });
    const [version] = await db
      .insert(schema.paperVersions)
      .values({
        paperId,
        versionNumber: 1,
        title: 'A multilingual catalog search fixture',
        abstract:
          'An abstract used to verify multilingual author full-text search. '.repeat(
            3,
          ),
        year: 2026,
        researchType: 'THESIS',
        keywords: ['catalog', 'search', 'research'],
        authors: [{ displayName: '李 O’Connor-Cruz', kind: 'person' }],
        publishedAt: new Date(),
      })
      .returning();
    await db
      .update(schema.papers)
      .set({ currentVersionId: version.id })
      .where(eq(schema.papers.id, paperId));
  });

  afterAll(async () => {
    await db.delete(schema.papers).where(eq(schema.papers.id, paperId));
    await db.delete(schema.accounts).where(eq(schema.accounts.id, accountId));
    await db.delete(schema.programs).where(eq(schema.programs.id, programId));
    await client.end();
  });

  it('matches multilingual and punctuated Author names in published results', async () => {
    for (const q of ['李', 'O’Connor-Cruz']) {
      const result = await useCases.listPublished({ q, page: 1, pageSize: 20 });
      expect(result.items.map(({ publicId: id }) => id)).toContain(publicId);
    }
  });
});
