import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { validateEnv } from '../src/config/env.js';
import type { Database } from '../src/database/database.js';
import { runMigrations } from '../src/database/migrate.js';
import * as schema from '../src/database/schema/index.js';
import { DrizzleAccountRepository } from '../src/modules/accounts/infrastructure/drizzle-account-repository.js';
import { DrizzleAuditReader } from '../src/modules/audit/infrastructure/drizzle-audit-reader.js';
import { PaperUseCases } from '../src/modules/paper/paper.use-cases.js';

const { accounts } = schema;

// Runs against the test database (like http.spec.ts), which it assumes owns
// all Coordinators: it deactivates existing ones to control the count.
describe('Account administration (database)', () => {
  const client = postgres(validateEnv().DATABASE_URL, { max: 10 });
  const db: Database = drizzle(client, { schema });
  const repo = new DrizzleAccountRepository(db);
  const reader = new DrizzleAuditReader(db);
  const papers = new PaperUseCases(db);

  const newCoordinator = async () => {
    const id = randomUUID();
    await db.insert(accounts).values({
      id,
      clerkUserId: `user_${id}`,
      name: 'Coord',
      email: `${id}@ncf.edu.ph`,
      role: 'COORDINATOR',
    });
    return id;
  };

  beforeAll(() => runMigrations());
  beforeEach(async () => {
    await db
      .update(accounts)
      .set({ status: 'DEACTIVATED' })
      .where(eq(accounts.role, 'COORDINATOR'));
  });
  afterAll(() => client.end());

  it('lets exactly one of two concurrent demotions win', async () => {
    const [a, b] = [await newCoordinator(), await newCoordinator()];
    const results = await Promise.all([
      repo.changeRole({
        actorId: a,
        accountId: b,
        role: 'INSTRUCTOR',
        reason: 'race',
      }),
      repo.changeRole({
        actorId: b,
        accountId: a,
        role: 'INSTRUCTOR',
        reason: 'race',
      }),
    ]);
    expect(results.map((r) => r.outcome).sort()).toEqual([
      'changed',
      'last_coordinator',
    ]);
    const left = await db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.role, 'COORDINATOR'), eq(accounts.status, 'ACTIVE')),
      );
    expect(left).toHaveLength(1);
  });

  it('lets exactly one of two concurrent deactivations win', async () => {
    const [a, b] = [await newCoordinator(), await newCoordinator()];
    const results = await Promise.all([
      repo.setStatus({
        actorId: a,
        accountId: b,
        status: 'DEACTIVATED',
        reason: 'race',
      }),
      repo.setStatus({
        actorId: b,
        accountId: a,
        status: 'DEACTIVATED',
        reason: 'race',
      }),
    ]);
    expect(results.map((r) => r.outcome).sort()).toEqual([
      'changed',
      'last_coordinator',
    ]);
  });

  it('revokes grants and cancels pending Access Requests with deactivation', async () => {
    const coordinatorId = await newCoordinator();
    const accountId = randomUUID();
    const programId = randomUUID();
    const paperId = randomUUID();
    const versionId = randomUUID();
    const requestId = randomUUID();
    try {
      await db
        .insert(schema.programs)
        .values({ id: programId, name: `Deactivate ${programId}` });
      await db.insert(accounts).values({
        id: accountId,
        clerkUserId: `user_${accountId}`,
        name: 'Requester',
        email: `${accountId}@gbox.ncf.edu.ph`,
        role: 'STUDENT',
      });
      await db.insert(schema.papers).values({
        id: paperId,
        publicId: paperId.replaceAll('-', ''),
        ownerId: accountId,
        adviserId: coordinatorId,
        programId,
        status: 'endorsed',
        publicationStatus: 'published',
        currentVersionId: versionId,
      });
      await db.insert(schema.paperVersions).values({
        id: versionId,
        paperId,
        versionNumber: 1,
        title: 'Reader',
        abstract: 'Abstract',
        year: 2026,
        researchType: 'THESIS',
        keywords: ['reader'],
        authors: [],
        publishedAt: new Date(),
      });
      await db.insert(schema.accessRequests).values({
        id: requestId,
        paperId,
        accountId,
        purpose: 'A legitimate academic purpose long enough.',
        status: 'approved',
        expiresAt: new Date(Date.now() + 60_000),
      });
      await db.insert(schema.accessGrants).values({
        requestId,
        paperId,
        versionId,
        accountId,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const [pendingRequest] = await db
        .insert(schema.accessRequests)
        .values({
          paperId,
          accountId,
          purpose: 'Another legitimate academic purpose long enough.',
          status: 'pending',
          expiresAt: new Date(Date.now() + 60_000),
        })
        .returning();

      await repo.setStatus({
        actorId: coordinatorId,
        accountId,
        status: 'DEACTIVATED',
        reason: 'Left the college',
      });

      const [grant] = await db
        .select()
        .from(schema.accessGrants)
        .where(eq(schema.accessGrants.accountId, accountId));
      const [request] = await db
        .select()
        .from(schema.accessRequests)
        .where(eq(schema.accessRequests.id, pendingRequest.id));
      expect(grant).toMatchObject({
        revokedAt: expect.any(Date),
        revocationReason: 'Account deactivated.',
      });
      expect(request).toMatchObject({
        status: 'cancelled',
        decidedAt: expect.any(Date),
      });
    } finally {
      await db.delete(schema.papers).where(eq(schema.papers.id, paperId));
      await db.delete(accounts).where(eq(accounts.id, accountId));
      await db.delete(schema.programs).where(eq(schema.programs.id, programId));
    }
  });

  it('audits changes with reasons and filters the log', async () => {
    const [a, b] = [await newCoordinator(), await newCoordinator()];
    await repo.changeRole({
      actorId: a,
      accountId: b,
      role: 'INSTRUCTOR',
      reason: 'Moved to teaching',
    });
    await repo.setStatus({
      actorId: a,
      accountId: b,
      status: 'DEACTIVATED',
      reason: 'On leave',
    });

    const window = { limit: 10, offset: 0 };
    const bySubject = await reader.find({ subjectId: b }, window);
    expect(bySubject.map((e) => e.action)).toEqual([
      'ACCOUNT_DEACTIVATED',
      'ACCOUNT_ROLE_CHANGED',
    ]);
    expect(bySubject[1]).toMatchObject({
      actorAccountId: a,
      actorName: 'Coord',
      details: {
        from: 'COORDINATOR',
        to: 'INSTRUCTOR',
        reason: 'Moved to teaching',
      },
    });
    expect(
      await reader.find(
        { subjectId: b, action: 'ACCOUNT_ROLE_CHANGED' },
        window,
      ),
    ).toHaveLength(1);
    expect(await reader.find({ subjectId: b, actorId: b }, window)).toEqual([]);
    expect(
      await reader.find({ subjectId: b, to: '2000-01-01T00:00:00Z' }, window),
    ).toEqual([]);
    expect(
      await reader.find({ subjectId: b, from: '2000-01-01T00:00:00Z' }, window),
    ).toHaveLength(2);
    expect(
      await reader.find({ subjectId: b }, { limit: 1, offset: 1 }),
    ).toHaveLength(1);
  });

  it('matches multilingual and punctuated Author names in published results', async () => {
    const accountId = randomUUID();
    const programId = randomUUID();
    const paperId = randomUUID();
    const publicId = randomUUID().replaceAll('-', '');
    try {
      await db
        .insert(schema.programs)
        .values({ id: programId, name: `Search test ${programId}` });
      await db.insert(accounts).values({
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

      for (const q of ['李', 'O’Connor-Cruz']) {
        const result = await papers.listPublished({ q, page: 1, pageSize: 20 });
        expect(result.items.map(({ publicId: id }) => id)).toContain(publicId);
      }
    } finally {
      await db.delete(schema.papers).where(eq(schema.papers.id, paperId));
      await db.delete(accounts).where(eq(accounts.id, accountId));
      await db.delete(schema.programs).where(eq(schema.programs.id, programId));
    }
  });
});
