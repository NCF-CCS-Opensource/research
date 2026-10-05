import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  getCurrentAccountContract,
  registerAccountContract,
  updateOwnProfileContract,
} from '@repo/contracts';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { ACCOUNT_REPOSITORY } from '../src/modules/accounts/application/account-repository.js';
import { TOKEN_VERIFIER } from '../src/modules/accounts/application/token-verifier.js';
import {
  FakeTokenVerifier,
  InMemoryAccountRepository,
} from './support/fakes.js';

process.env.DATABASE_URL ??= 'postgresql://unused@localhost:5432/unused';

const base = '/v1/api';
const get = (app: INestApplication, path: string, token?: string) => {
  const req = request(app.getHttpServer()).get(`${base}${path}`);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};
const post = (
  app: INestApplication,
  path: string,
  token: string | undefined,
  body: object,
) => {
  const req = request(app.getHttpServer()).post(`${base}${path}`);
  return (token ? req.set('Authorization', `Bearer ${token}`) : req).send(body);
};

describe('Sign-in and Registration', () => {
  let app: INestApplication;
  let tokens: FakeTokenVerifier;
  let accounts: InMemoryAccountRepository;
  const programId = randomUUID();

  const signIn = (token: string, email: string) =>
    tokens.identities.set(token, { clerkUserId: `user_${token}`, email });

  beforeEach(async () => {
    tokens = new FakeTokenVerifier();
    accounts = new InMemoryAccountRepository();
    accounts.activePrograms.add(programId);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(tokens)
      .overrideProvider(ACCOUNT_REPOSITORY)
      .useValue(accounts)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(() => app.close());

  it('reports guest without a token or with an unknown token', async () => {
    for (const token of [undefined, 'garbage']) {
      const res = await get(app, getCurrentAccountContract.path, token).expect(
        200,
      );
      expect(res.body.data).toEqual({ state: 'guest' });
    }
  });

  it('reports registering for a verified identity without an Account', async () => {
    signIn('t1', 'Ana@GBOX.ncf.edu.ph');
    const res = await get(app, getCurrentAccountContract.path, 't1').expect(
      200,
    );
    expect(res.body.data).toEqual({
      state: 'registering',
      email: 'ana@gbox.ncf.edu.ph',
    });
  });

  it('rejects a registering identity on protected routes and guests with 401', async () => {
    signIn('t1', 'ana@gbox.ncf.edu.ph');
    const registering = await post(app, updateOwnProfileContract.path, 't1', {
      name: 'Ana',
      programId: null,
    }).expect(403);
    expect(registering.body.error.code).toBe('REGISTRATION_REQUIRED');
    await post(app, updateOwnProfileContract.path, undefined, {}).expect(401);
    await post(app, registerAccountContract.path, undefined, {
      name: 'Ana',
    }).expect(401);
  });

  it('registers a Student with the token email and audits it', async () => {
    signIn('t1', 'Ana@gbox.ncf.edu.ph');
    const res = await post(app, registerAccountContract.path, 't1', {
      name: '  Ana Cruz ',
      programId,
    }).expect(200);
    expect(registerAccountContract.response.parse(res.body).data).toMatchObject(
      {
        name: 'Ana Cruz',
        email: 'ana@gbox.ncf.edu.ph',
        role: 'STUDENT',
        programId,
      },
    );
    expect(accounts.audit).toEqual([
      { action: 'ACCOUNT_REGISTERED', subjectId: res.body.data.id },
    ]);

    const current = await get(app, getCurrentAccountContract.path, 't1').expect(
      200,
    );
    expect(current.body.data.state).toBe('active');
    expect(current.body.data.account.role).toBe('STUDENT');
  });

  it('registers an Instructor without a Program', async () => {
    signIn('t2', 'prof@ncf.edu.ph');
    const res = await post(app, registerAccountContract.path, 't2', {
      name: 'Prof',
    }).expect(200);
    expect(res.body.data).toMatchObject({
      role: 'INSTRUCTOR',
      programId: null,
    });
  });

  it('refuses other domains with an authored message', async () => {
    signIn('t3', 'someone@gmail.com');
    const res = await post(app, registerAccountContract.path, 't3', {
      name: 'Someone',
    }).expect(403);
    expect(res.body.error.code).toBe('EMAIL_DOMAIN_NOT_ALLOWED');
    expect(res.body.error.message).toContain('NCF email');
    expect(accounts.accounts).toHaveLength(0);
  });

  it('refuses an unknown or inactive Program', async () => {
    signIn('t1', 'ana@gbox.ncf.edu.ph');
    const res = await post(app, registerAccountContract.path, 't1', {
      name: 'Ana',
      programId: randomUUID(),
    }).expect(400);
    expect(res.body.error.code).toBe('PROGRAM_NOT_FOUND');
  });

  it('refuses a second Registration', async () => {
    signIn('t1', 'ana@gbox.ncf.edu.ph');
    await post(app, registerAccountContract.path, 't1', { name: 'Ana' }).expect(
      200,
    );
    const res = await post(app, registerAccountContract.path, 't1', {
      name: 'Ana',
    }).expect(409);
    expect(res.body.error.code).toBe('ALREADY_REGISTERED');
  });

  it('refuses an email already held by another identity', async () => {
    signIn('t1', 'ana@gbox.ncf.edu.ph');
    signIn('t4', 'ANA@gbox.ncf.edu.ph');
    await post(app, registerAccountContract.path, 't1', { name: 'Ana' }).expect(
      200,
    );
    await post(app, registerAccountContract.path, 't4', {
      name: 'Ana 2',
    }).expect(409);
  });

  it('updates the Account email when the token email differs', async () => {
    signIn('t1', 'ana@gbox.ncf.edu.ph');
    await post(app, registerAccountContract.path, 't1', { name: 'Ana' }).expect(
      200,
    );
    signIn('t1', 'Ana.Cruz@gbox.ncf.edu.ph');
    const res = await get(app, getCurrentAccountContract.path, 't1').expect(
      200,
    );
    expect(res.body.data.account.email).toBe('ana.cruz@gbox.ncf.edu.ph');
  });

  it('keeps the Account email when the token email belongs to another Account', async () => {
    signIn('t1', 'ana@gbox.ncf.edu.ph');
    signIn('t4', 'bo@gbox.ncf.edu.ph');
    await post(app, registerAccountContract.path, 't1', { name: 'Ana' }).expect(
      200,
    );
    await post(app, registerAccountContract.path, 't4', { name: 'Bo' }).expect(
      200,
    );
    signIn('t4', 'ana@gbox.ncf.edu.ph');
    const res = await get(app, getCurrentAccountContract.path, 't4').expect(
      200,
    );
    expect(res.body.data.account.email).toBe('bo@gbox.ncf.edu.ph');
  });

  it('lets an Account update its own name and Program', async () => {
    signIn('t1', 'ana@gbox.ncf.edu.ph');
    await post(app, registerAccountContract.path, 't1', { name: 'Ana' }).expect(
      200,
    );
    const res = await post(app, updateOwnProfileContract.path, 't1', {
      name: 'Ana C.',
      programId,
    }).expect(200);
    expect(res.body.data).toMatchObject({ name: 'Ana C.', programId });
    await post(app, updateOwnProfileContract.path, 't1', {
      name: 'Ana C.',
      programId: randomUUID(),
    }).expect(400);
  });

  it('rejects a deactivated Account everywhere but get-current', async () => {
    signIn('t1', 'ana@gbox.ncf.edu.ph');
    await post(app, registerAccountContract.path, 't1', { name: 'Ana' }).expect(
      200,
    );
    accounts.accounts[0].status = 'DEACTIVATED';

    const res = await post(app, updateOwnProfileContract.path, 't1', {
      name: 'Ana',
      programId: null,
    }).expect(403);
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    await post(app, registerAccountContract.path, 't1', { name: 'Ana' }).expect(
      403,
    );
    const current = await get(app, getCurrentAccountContract.path, 't1').expect(
      200,
    );
    expect(current.body.data).toEqual({ state: 'deactivated' });
  });
});
