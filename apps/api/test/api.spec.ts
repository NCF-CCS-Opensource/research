import "reflect-metadata"
import {
  Body,
  Controller,
  Get,
  type INestApplication,
  Post,
  UsePipes,
} from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { listCategoriesContract } from "@repo/contracts"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { AppModule } from "../src/app.module"
import { Public } from "../src/common/decorators/public.decorator"
import { DomainError } from "../src/common/errors/domain.error"
import { ZodValidationPipe } from "../src/common/pipes/zod-validation.pipe"
import type { Database } from "../src/database/database"
import { DATABASE_CONNECTION } from "../src/database/database.module"
import { runMigrations } from "../src/database/migrate"
import { categories } from "../src/database/schema"

const testValidationSchema = z.object({
  name: z.string().min(1, { message: "Category name is required" }),
})

@Controller()
class TestHarnessController {
  @Get("/unmarked-route")
  unmarked() {
    return { ok: true }
  }

  @Public()
  @Get("/test-domain-error")
  domainError() {
    throw new DomainError(
      "SAMPLE_DOMAIN_ERROR",
      "Authored domain error message",
      400
    )
  }

  @Public()
  @Get("/test-unhandled-error")
  unhandledError() {
    throw new Error("Secret database crash that should not leak")
  }

  @Public()
  @Post("/test-validation")
  @UsePipes(new ZodValidationPipe(testValidationSchema))
  validation(@Body() body: unknown) {
    return body
  }
}

describe("API foundation tracer bullet", () => {
  let app: INestApplication
  let db: Database

  beforeAll(async () => {
    // Run database migrations on real PostgreSQL
    await runMigrations()

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestHarnessController],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    db = moduleFixture.get<Database>(DATABASE_CONNECTION)
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  beforeEach(async () => {
    // Clean categories table before each test
    await db.delete(categories)
  })

  describe("Category list endpoint (GET /taxonomy/list-categories)", () => {
    it("returns an empty list when no categories exist", async () => {
      const res = await request(app.getHttpServer())
        .get(listCategoriesContract.path)
        .expect(200)

      expect(res.body).toEqual([])
    })

    it("returns categories ordered by name from real PostgreSQL", async () => {
      await db.insert(categories).values([
        { id: "10000000-0000-0000-0000-000000000002", name: "Software Engineering" },
        { id: "10000000-0000-0000-0000-000000000001", name: "Data Science" },
      ])

      const res = await request(app.getHttpServer())
        .get(listCategoriesContract.path)
        .expect(200)

      expect(res.body).toEqual([
        { id: "10000000-0000-0000-0000-000000000001", name: "Data Science" },
        { id: "10000000-0000-0000-0000-000000000002", name: "Software Engineering" },
      ])
    })
  })

  describe("Global guard deny-by-default", () => {
    it("rejects an unmarked route by default", async () => {
      const res = await request(app.getHttpServer())
        .get("/unmarked-route")
        .expect(401)

      expect(res.body).toMatchObject({
        message: "Authentication required",
      })
    })

    it("allows Category list because it is marked with @Public()", async () => {
      await request(app.getHttpServer())
        .get(listCategoriesContract.path)
        .expect(200)
    })
  })

  describe("ADR 0004 Failure format", () => {
    it("returns 400 with authored field messages for invalid requests", async () => {
      const res = await request(app.getHttpServer())
        .post("/test-validation")
        .send({ name: "" })
        .expect(400)

      expect(res.body).toEqual({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        errors: [
          {
            field: "name",
            message: "Category name is required",
          },
        ],
      })
    })

    it("returns domain errors with their code and authored message", async () => {
      const res = await request(app.getHttpServer())
        .get("/test-domain-error")
        .expect(400)

      expect(res.body).toEqual({
        code: "SAMPLE_DOMAIN_ERROR",
        message: "Authored domain error message",
      })
    })

    it("returns 500 with generic message for unhandled errors without leaking internals", async () => {
      const res = await request(app.getHttpServer())
        .get("/test-unhandled-error")
        .expect(500)

      expect(res.body).toEqual({
        message: "Something went wrong. Please try again.",
      })
      expect(JSON.stringify(res.body)).not.toContain("Secret database crash")
    })
  })
})
