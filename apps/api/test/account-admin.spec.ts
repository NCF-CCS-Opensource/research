import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AUDIT_PAGE_SIZE,
  changeAccountRoleContract,
  deactivateAccountContract,
  listAccountsContract,
  listAuditEventsContract,
  reactivateAccountContract,
  registerAccountContract,
  updateOwnProfileContract,
} from '@repo/contracts';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { ACCOUNT_REPOSITORY } from '../src/modules/accounts/application/account-repository.js';
import { TOKEN_VERIFIER } from '../src/modules/accounts/application/token-verifier.js';
import {
  AUDIT_READER,
  type AuditReader,
} from '../src/modules/audit/application/audit-reader.js';
import {
  FakeTokenVerifier,
  InMemoryAccountRepository,
} from './support/fakes.js';

process.env.DATABASE_URL ??= 'postgresql://unused@localhost:5432/unused';

const base = '/v1/api';

describe('Account administration', () => {
  let app: INestApplication;
  let tokens: FakeTokenVerifier;
  let accounts: InMemoryAccountRepository;
  let auditCalls: Parameters<AuditReader['find']>[];
  let auditRows: number;

  const call = (
    method: 'get' | 'post',
    path: string,
    token: string | undefined,
    body?: object,
  ) => {
    const req = request(app.getHttpServer())[method](`${base}${path}`);
    return (token ? req.set('Authorization', `Bearer ${token}`) : req).send(
      body,
    );
  };

  /** Registers a person and returns their Account id. */
  const join = async (token: string, email: string) => {
    tokens.identities.set(token, { clerkUserId: `user_${token}`, email });
    const res = await call('post', registerAccountContract.path, token, {
      name: token,
    }).expect(200);
    return res.body.data.id as string;
  };
  const makeCoordinator = (id: string) => {
    accounts.accounts.find((a) => a.id === id)!.role = 'COORDINATOR';
  };

  let boss: string;
  let student: string;

  beforeEach(async () => {
    tokens = new FakeTokenVerifier();
    accounts = new InMemoryAccountRepository();
    auditCalls = [];
    auditRows = 0;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(tokens)
      .overrideProvider(ACCOUNT_REPOSITORY)
      .useValue(accounts)
      .overrideProvider(AUDIT_READER)
      .useValue({
        find: (...args: Parameters<AuditReader['find']>) => {
          auditCalls.push(args);
          return Promise.resolve(
            Array.from({ length: auditRows }, (_, i) => ({
              id: crypto.randomUUID(),
              occurredAt: new Date(i).toISOString(),
              actorAccountId: null,
              actorName: null,
              action: 'X',
              subjectType: 'ACCOUNT',
              subjectId: crypto.randomUUID(),
              details: null,
            })),
          );
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    boss = await join('boss', 'dean@ncf.edu.ph');
    makeCoordinator(boss);
    student = await join('stu', 'ana@gbox.ncf.edu.ph');
  });

  afterEach(() => app.close());

  it('lists Accounts for a Coordinator only', async () => {
    const res = await call('get', listAccountsContract.path, 'boss').expect(
      200,
    );
    const { data } = listAccountsContract.response.parse(res.body);
    expect(data.map((a) => a.email).sort()).toEqual([
      'ana@gbox.ncf.edu.ph',
      'dean@ncf.edu.ph',
    ]);
    expect(data[0]).toHaveProperty('status');
    expect(data[0]).toHaveProperty('programName');

    await call('get', listAccountsContract.path, 'stu').expect(403);
    await call('get', listAccountsContract.path, undefined).expect(401);
  });

  it('changes a role with a reason and audits it', async () => {
    const res = await call('post', changeAccountRoleContract.path, 'boss', {
      accountId: student,
      role: 'INSTRUCTOR',
      reason: 'Hired as teaching assistant',
    }).expect(200);
    expect(res.body.data.role).toBe('INSTRUCTOR');
    expect(accounts.audit).toContainEqual({
      action: 'ACCOUNT_ROLE_CHANGED',
      subjectId: student,
    });
  });

  it('requires a reason and a Coordinator for every change', async () => {
    for (const path of [
      changeAccountRoleContract.path,
      deactivateAccountContract.path,
      reactivateAccountContract.path,
    ]) {
      const noReason = await call('post', path, 'boss', {
        accountId: student,
        role: 'INSTRUCTOR',
        reason: '   ',
      }).expect(400);
      expect(noReason.body.error.message).toContain('Enter a reason.');
      await call('post', path, 'stu', {
        accountId: student,
        role: 'COORDINATOR',
        reason: 'Promote me',
      }).expect(403);
    }
    expect(accounts.accounts.find((a) => a.id === student)!.role).toBe(
      'STUDENT',
    );
  });

  it('rejects a deactivated Account on its very next request', async () => {
    await call('post', deactivateAccountContract.path, 'boss', {
      accountId: student,
      reason: 'Left the college',
    }).expect(200);
    const res = await call('post', updateOwnProfileContract.path, 'stu', {
      name: 'Ana',
      programId: null,
    }).expect(403);
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');

    await call('post', reactivateAccountContract.path, 'boss', {
      accountId: student,
      reason: 'Returned',
    }).expect(200);
    await call('post', updateOwnProfileContract.path, 'stu', {
      name: 'Ana',
      programId: null,
    }).expect(200);
    expect(accounts.audit.map((e) => e.action)).toEqual(
      expect.arrayContaining(['ACCOUNT_DEACTIVATED', 'ACCOUNT_REACTIVATED']),
    );
  });

  it('refuses to demote or deactivate the last active Coordinator', async () => {
    const demote = await call('post', changeAccountRoleContract.path, 'boss', {
      accountId: boss,
      role: 'INSTRUCTOR',
      reason: 'Stepping down',
    }).expect(409);
    expect(demote.body.error.code).toBe('LAST_COORDINATOR');
    await call('post', deactivateAccountContract.path, 'boss', {
      accountId: boss,
      reason: 'Leaving',
    }).expect(409);

    // With a second Coordinator the first may step down.
    const second = await join('two', 'reg@ncf.edu.ph');
    makeCoordinator(second);
    await call('post', changeAccountRoleContract.path, 'boss', {
      accountId: boss,
      role: 'INSTRUCTOR',
      reason: 'Stepping down',
    }).expect(200);
  });

  it('answers unknown Accounts and repeated settings clearly', async () => {
    await call('post', deactivateAccountContract.path, 'boss', {
      accountId: crypto.randomUUID(),
      reason: 'Why not',
    }).expect(404);
    await call('post', reactivateAccountContract.path, 'boss', {
      accountId: student,
      reason: 'Already active',
    }).expect(409);
  });

  describe('audit browsing', () => {
    it('is for Coordinators only', async () => {
      await call('get', listAuditEventsContract.path, 'stu').expect(403);
    });

    it('passes filters through and paginates', async () => {
      auditRows = AUDIT_PAGE_SIZE + 1;
      const filters = new URLSearchParams({
        actorId: boss,
        action: 'ACCOUNT_ROLE_CHANGED',
        subjectId: student,
        from: '2026-01-01T00:00:00Z',
        to: '2026-12-31T00:00:00Z',
        page: '2',
      });
      const res = await call(
        'get',
        `${listAuditEventsContract.path}?${filters}`,
        'boss',
      ).expect(200);
      const { data } = listAuditEventsContract.response.parse(res.body);
      expect(data).toMatchObject({
        page: 2,
        pageSize: AUDIT_PAGE_SIZE,
        hasMore: true,
      });
      expect(data.items).toHaveLength(AUDIT_PAGE_SIZE);
      expect(auditCalls[0]).toEqual([
        {
          actorId: boss,
          action: 'ACCOUNT_ROLE_CHANGED',
          subjectId: student,
          from: '2026-01-01T00:00:00Z',
          to: '2026-12-31T00:00:00Z',
        },
        { limit: AUDIT_PAGE_SIZE + 1, offset: AUDIT_PAGE_SIZE },
      ]);
    });

    it('rejects a malformed filter', async () => {
      await call(
        'get',
        `${listAuditEventsContract.path}?actorId=nope`,
        'boss',
      ).expect(400);
    });
  });
});
