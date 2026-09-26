import "reflect-metadata"
import type { INestApplication } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { listProgramsContract } from "@repo/contracts"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { AppModule } from "../src/app.module"
import type { Database } from "../src/database/database"
import { DATABASE_CONNECTION } from "../src/database/database.module"
import { runMigrations } from "../src/database/migrate"
import { programs } from "../src/database/schema"

describe("Taxonomy module", () => {
  let app: INestApplication
  let db: Database

  beforeAll(async () => {
    await runMigrations()

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
    await db.delete(programs)
  })

  describe("Program list endpoint (GET /taxonomy/list-programs)", () => {
    it("returns an empty list when no programs exist", async () => {
      const res = await request(app.getHttpServer())
        .get(listProgramsContract.path)
        .expect(200)

      expect(res.body).toEqual([])
    })

    it("is public and returns programs ordered by name from real PostgreSQL", async () => {
      await db.insert(programs).values([
        {
          id: "20000000-0000-0000-0000-000000000002",
          name: "Information Technology",
        },
        { id: "20000000-0000-0000-0000-000000000001", name: "Biology" },
      ])

      const res = await request(app.getHttpServer())
        .get(listProgramsContract.path)
        .expect(200)

      expect(res.body).toEqual([
        { id: "20000000-0000-0000-0000-000000000001", name: "Biology" },
        {
          id: "20000000-0000-0000-0000-000000000002",
          name: "Information Technology",
        },
      ])
    })
  })
})
