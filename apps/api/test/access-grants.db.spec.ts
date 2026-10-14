import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getPaperContentContract } from '@repo/contracts';
import { and, eq, gt, isNull } from 'drizzle-orm';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { DATABASE } from '../src/database/database.module.js';
import { runMigrations } from '../src/database/migrate.js';
import type { Database } from '../src/database/database.js';
import * as schema from '../src/database/schema/index.js';
import { accounts } from '../src/database/schema/accounts.js';
import { papers, paperVersions } from '../src/database/schema/papers.js';
import { paperFiles } from '../src/database/schema/paper-files.js';
import {
  accessGrants,
  accessRequests,
} from '../src/database/schema/access-requests.js';
import { TOKEN_VERIFIER } from '../src/modules/accounts/application/token-verifier.js';
import type { VerifiedIdentity } from '../src/modules/accounts/application/token-verifier.js';
import { AccessRequestUseCases } from '../src/modules/access-requests/access-request.use-cases.js';
import { DrizzleAccountRepository } from '../src/modules/accounts/infrastructure/drizzle-account-repository.js';
import {
  PAPER_FILE_STORAGE,
  type PaperFileStorage,
} from '../src/modules/paper-files/storage.js';
import { FakeTokenVerifier } from './support/fakes.js';

process.env.DATABASE_URL ??= 'postgresql://unused@localhost:5432/unused';

const base = '/v1/api';
const content = Buffer.from('%PDF-0123456789');

class MemoryStorage implements PaperFileStorage {
  readonly objects = new Map<string, Buffer>();
  async put(key: string, stream: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    this.objects.set(key, Buffer.concat(chunks));
  }
  async get(key: string, start?: number, end?: number) {
    const file = this.objects.get(key)!;
    return Readable.from([
      start === undefined
        ? file
        : file.subarray(start, (end ?? file.length - 1) + 1),
    ]);
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
}

describe('Access Grants (database)', () => {
  let app: INestApplication;
  let db: Database;
  let tokens: FakeTokenVerifier;
  let storage: MemoryStorage;
  let accountsRepo: DrizzleAccountRepository;
  let decisions: AccessRequestUseCases;

  beforeAll(async () => {
    await runMigrations();
    tokens = new FakeTokenVerifier();
    storage = new MemoryStorage();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(tokens)
      .overrideProvider(PAPER_FILE_STORAGE)
      .useValue(storage)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    db = moduleRef.get<Database>(DATABASE);
    accountsRepo = new DrizzleAccountRepository(db);
    decisions = new AccessRequestUseCases(db);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function account(role: 'STUDENT' | 'INSTRUCTOR' | 'COORDINATOR') {
    const id = randomUUID();
    const clerkUserId = `access_${id}`;
    const email = `${id}@${role === 'STUDENT' ? 'gbox.ncf.edu.ph' : 'ncf.edu.ph'}`;
    const identity: VerifiedIdentity = { clerkUserId, email };
    const token = `token_${id}`;
    tokens.identities.set(token, identity);
    const [row] = await db
      .insert(accounts)
      .values({
        id,
        clerkUserId,
        name: role,
        email,
        role,
      })
      .returning();
    return { row, token };
  }

  async function paperFixture(
    ownerId: string,
    readerId: string,
    adviserId: string,
  ) {
    const [program] = await db
      .insert(schema.programs)
      .values({
        name: `Access test ${randomUUID()}`,
      })
      .returning();
    const paperId = randomUUID();
    const publicId = paperId.replaceAll('-', '');
    const versionId = randomUUID();
    const requestId = randomUUID();
    const fileId = randomUUID();
    const objectKey = `access-test/${fileId}`;
    const expiresAt = new Date(Date.now() + 60_000);
    try {
      await db.insert(papers).values({
        id: paperId,
        publicId,
        ownerId,
        adviserId,
        programId: program.id,
        status: 'endorsed',
        publicationStatus: 'published',
      });
      await db.insert(paperVersions).values({
        id: versionId,
        paperId,
        versionNumber: 1,
        title: 'Access test Paper',
        abstract: 'An abstract for an access test Paper.',
        year: 2026,
        researchType: 'THESIS',
        keywords: ['access'],
        authors: [],
        publishedAt: new Date(),
      });
      await db.insert(paperFiles).values({
        id: fileId,
        paperId,
        versionId,
        ownerId,
        objectKey,
        filename: 'access-test.pdf',
        byteCount: content.length,
        sha256: '0'.repeat(64),
        status: 'CLEAN',
      });
      await db
        .update(paperVersions)
        .set({ pdfFileId: fileId })
        .where(eq(paperVersions.id, versionId));
      await db
        .update(papers)
        .set({ currentVersionId: versionId })
        .where(eq(papers.id, paperId));
      await db.insert(accessRequests).values({
        id: requestId,
        paperId,
        accountId: readerId,
        purpose: 'A controlled test of academic access to this Paper.',
        status: 'approved',
        expiresAt,
        grantExpiresAt: expiresAt,
      });
      await db.insert(accessGrants).values({
        requestId,
        paperId,
        versionId,
        accountId: readerId,
        expiresAt,
      });
      storage.objects.set(objectKey, content);
      return {
        paperId,
        publicId,
        versionId,
        requestId,
        fileId,
        objectKey,
        programId: program.id,
        expiresAt,
      };
    } catch (error) {
      await db.delete(papers).where(eq(papers.id, paperId));
      await db
        .delete(schema.programs)
        .where(eq(schema.programs.id, program.id));
      throw error;
    }
  }

  async function cleanFixture(
    fixture: Awaited<ReturnType<typeof paperFixture>>,
  ) {
    await db.delete(paperFiles).where(eq(paperFiles.id, fixture.fileId));
    await db.delete(papers).where(eq(papers.id, fixture.paperId));
    await db
      .delete(schema.programs)
      .where(eq(schema.programs.id, fixture.programId));
    storage.objects.delete(fixture.objectKey);
  }

  function contentRequest(publicId: string, token: string) {
    const path = getPaperContentContract.path.replace(':publicId', publicId);
    return request(app.getHttpServer())
      .get(`${base}${path}`)
      .set('Authorization', `Bearer ${token}`);
  }

  it('checks server expiry independently for full and ranged content requests', async () => {
    const reader = await account('STUDENT');
    const owner = await account('STUDENT');
    const adviser = await account('INSTRUCTOR');
    const fixture = await paperFixture(
      owner.row.id,
      reader.row.id,
      adviser.row.id,
    );
    try {
      await contentRequest(fixture.publicId, reader.token).expect(200);
      await contentRequest(fixture.publicId, reader.token)
        .set('Range', 'bytes=0-4')
        .expect(206)
        .expect('Content-Range', `bytes 0-4/${content.length}`);

      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(fixture.expiresAt.getTime() + 1);
      await contentRequest(fixture.publicId, reader.token).expect(404);
      await contentRequest(fixture.publicId, reader.token)
        .set('Range', 'bytes=0-4')
        .expect(404);
    } finally {
      vi.useRealTimers();
      await cleanFixture(fixture);
    }
  });

  it('evaluates the account on the request instead of reusing the viewer holder', async () => {
    const reader = await account('STUDENT');
    const other = await account('STUDENT');
    const owner = await account('STUDENT');
    const adviser = await account('INSTRUCTOR');
    const fixture = await paperFixture(
      owner.row.id,
      reader.row.id,
      adviser.row.id,
    );
    try {
      const response = await contentRequest(
        fixture.publicId,
        other.token,
      ).expect(404);
      expect(response.text).not.toContain('%PDF-');
    } finally {
      await cleanFixture(fixture);
    }
  });

  it('cannot leave an active grant when approval races Account deactivation', async () => {
    const requester = await account('STUDENT');
    const owner = await account('STUDENT');
    const adviser = await account('COORDINATOR');
    const coordinator = await account('COORDINATOR');
    const fixture = await paperFixture(
      owner.row.id,
      requester.row.id,
      adviser.row.id,
    );
    try {
      await db
        .delete(accessGrants)
        .where(eq(accessGrants.requestId, fixture.requestId));
      await db
        .update(accessRequests)
        .set({
          status: 'pending',
          grantExpiresAt: null,
          decidedAt: null,
          decidedBy: null,
        })
        .where(eq(accessRequests.id, fixture.requestId));
      const now = new Date();
      const [decision, deactivation] = await Promise.allSettled([
        decisions.decide(
          { kind: 'active', account: adviser.row },
          fixture.requestId,
          'approve',
          { days: 1 },
        ),
        accountsRepo.setStatus({
          actorId: coordinator.row.id,
          accountId: requester.row.id,
          status: 'DEACTIVATED',
          reason: 'Race test',
        }),
      ]);
      expect(deactivation.status).toBe('fulfilled');
      if (decision.status === 'rejected')
        expect(decision.reason).toMatchObject({ status: 409 });
      const [activeGrant] = await db
        .select()
        .from(accessGrants)
        .where(
          and(
            eq(accessGrants.requestId, fixture.requestId),
            isNull(accessGrants.revokedAt),
            gt(accessGrants.expiresAt, now),
          ),
        );
      expect(activeGrant).toBeUndefined();
      const [savedRequest] = await db
        .select()
        .from(accessRequests)
        .where(eq(accessRequests.id, fixture.requestId));
      if (savedRequest.status === 'approved') {
        await expect(
          decisions.check(
            { kind: 'active', account: requester.row },
            fixture.publicId,
          ),
        ).resolves.toMatchObject({
          state: 'revoked',
          requestId: fixture.requestId,
        });
      } else {
        expect(savedRequest.status).toBe('cancelled');
      }
    } finally {
      await cleanFixture(fixture);
    }
  });
});
