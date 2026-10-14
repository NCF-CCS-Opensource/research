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

const { accounts } = schema;

// Runs against the test database (like http.spec.ts), which it assumes owns
// all Coordinators: it deactivates existing ones to control the count.
describe('Account administration (database)', () => {
  const client = postgres(validateEnv().DATABASE_URL, { max: 10 });
  const db: Database = drizzle(client, { schema });
  const repo = new DrizzleAccountRepository(db);
  const reader = new DrizzleAuditReader(db);

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
});
