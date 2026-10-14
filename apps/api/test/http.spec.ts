import { Body, Controller, Get, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LICENCES, referenceDataContract } from '@repo/contracts';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { z } from 'zod';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { DomainError } from '../src/shared/domain/domain-error.js';
import { Public } from '../src/common/public.decorator.js';
import { ZodBody } from '../src/common/zod-body.pipe.js';
import { DATABASE } from '../src/database/database.module.js';
import { runMigrations } from '../src/database/migrate.js';
import type { Database } from '../src/database/database.js';
import { programs } from '../src/database/schema/index.js';

const base = '/v1/api';

@Controller('probe')
class ProbeController {
  @Get('unmarked')
  unmarked() {
    return { reached: true };
  }

  @Public()
  @Get('domain-error')
  domainError() {
    throw new DomainError(
      'PROBE_REFUSED',
      'The probe refused this.',
      'conflict',
    );
  }

  @Public()
  @Get('crash')
  crash() {
    throw new Error('secret database detail');
  }

  @Public()
  @Post('validate')
  validate(
    @Body(
      new ZodBody(
        z.object({ title: z.string().min(3, 'Title needs 3 characters.') }),
      ),
    )
    body: {
      title: string;
    },
  ) {
    return body;
  }
}

describe('HTTP foundation', () => {
  let app: INestApplication;
  let db: Database;

  beforeAll(async () => {
    await runMigrations();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    db = moduleRef.get<Database>(DATABASE);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /reference-data/get', () => {
    it('is public and returns seeded Programs, Research Types and Licences', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}${referenceDataContract.path}`)
        .expect(200);

      const body = referenceDataContract.response.parse(res.body);
      expect(body.data.programs.map((p) => p.name)).toContain(
        'BS Computer Science',
      );
      expect(body.data.researchTypes.map((t) => t.value)).toEqual([
        'THESIS',
        'CAPSTONE',
        'RESEARCH_PAPER',
        'PROJECT_REPORT',
      ]);
      expect(body.data.licences).toEqual([...LICENCES]);
    });

    it('omits inactive Programs', async () => {
      await db
        .insert(programs)
        .values({ name: 'Retired Program', active: false });
      try {
        const res = await request(app.getHttpServer()).get(
          `${base}/reference-data/get`,
        );
        expect(
          res.body.data.programs.map((p: { name: string }) => p.name),
        ).not.toContain('Retired Program');
      } finally {
        await db.delete(programs).where(eq(programs.name, 'Retired Program'));
      }
    });
  });

  describe('default deny', () => {
    it('rejects a route without the public marker', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/probe/unmarked`)
        .expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
      expect(res.body.meta.requestId).toEqual(expect.any(String));
    });
  });

  describe('failure format', () => {
    it('returns 400 with authored field messages for invalid requests', async () => {
      const res = await request(app.getHttpServer())
        .post(`${base}/probe/validate`)
        .send({ title: 'a' })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.message).toContain('Title needs 3 characters.');
    });

    it('returns a domain error with its code and authored message', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/probe/domain-error`)
        .expect(409);
      expect(res.body.error).toEqual({
        code: 'PROBE_REFUSED',
        message: 'The probe refused this.',
      });
    });

    it('returns a generic 500 and hides the original error', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/probe/crash`)
        .expect(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(res.body)).not.toContain('secret');
    });

    it('wraps unknown routes in the error envelope', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/nope`)
        .expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('health', () => {
    it('reports liveness', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/health/get-live`)
        .expect(200);
      expect(res.body.data).toEqual({ status: 'ok' });
    });

    it('reports readiness without secrets', async () => {
      const res = await request(app.getHttpServer())
        .get(`${base}/health/get-ready`)
        .expect(200);
      expect(res.body.data).toEqual({ status: 'ok' });
      expect(JSON.stringify(res.body)).not.toContain('postgres');
    });
  });
});
