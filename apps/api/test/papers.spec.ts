import "reflect-metadata"
import type { INestApplication } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { createPaperContract } from "@repo/contracts"
import { listAdvisersContract } from "@repo/contracts"
import { eq } from "drizzle-orm"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { AppModule } from "../src/app.module"
import type { Database } from "../src/database/database"
import { DATABASE_CONNECTION } from "../src/database/database.module"
import { runMigrations } from "../src/database/migrate"
import {
  auditEvents,
  depositNotices,
  paperVersions,
  papers,
  profiles,
  programs,
} from "../src/database/schema"
import { TOKEN_VERIFIER } from "../src/modules/account/application/token-verifier.interface"

const identities = {
  owner: { clerkUserId: "paper_owner", email: "owner@gbox.ncf.edu.ph" },
  adviser: { clerkUserId: "paper_adviser", email: "adviser@ncf.edu.ph" },
  other: { clerkUserId: "paper_other", email: "other@gbox.ncf.edu.ph" },
}

describe("Paper drafts API", () => {
  let app: INestApplication
  let db: Database

  beforeAll(async () => {
    await runMigrations()
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue({
        verify: async (token: string) =>
          identities[token as keyof typeof identities] ?? null,
      })
      .compile()
    app = moduleFixture.createNestApplication()
    await app.init()
    db = moduleFixture.get<Database>(DATABASE_CONNECTION)
  })

  afterAll(async () => app?.close())

  beforeEach(async () => {
    await db.delete(papers)
    await db.delete(auditEvents)
    await db.delete(depositNotices)
    await db.delete(profiles)
    await db.delete(programs)
    await db
      .insert(programs)
      .values({ id: "40000000-0000-0000-0000-000000000001", name: "Computing" })
    await db.insert(profiles).values([
      {
        id: "40000000-0000-0000-0000-000000000002",
        clerkUserId: identities.owner.clerkUserId,
        fullName: "Paper Owner",
        email: identities.owner.email,
        role: "user",
        status: "active",
      },
      {
        id: "40000000-0000-0000-0000-000000000003",
        clerkUserId: identities.adviser.clerkUserId,
        fullName: "Paper Adviser",
        email: identities.adviser.email,
        role: "instructor",
        status: "active",
      },
      {
        id: "40000000-0000-0000-0000-000000000004",
        clerkUserId: identities.other.clerkUserId,
        fullName: "Other Student",
        email: identities.other.email,
        role: "user",
        status: "active",
      },
      {
        id: "40000000-0000-0000-0000-000000000005",
        clerkUserId: "paper_admin",
        fullName: "Legacy Admin",
        email: "legacy-admin@ncf.edu.ph",
        role: "admin",
        status: "active",
      },
    ])
  })

  it("creates, manages, locks, and deletes a draft while hiding it from other Accounts", async () => {
    const input = {
      title: "A draft research title",
      abstract: "A".repeat(100),
      authors: [{ displayName: "Ada Lovelace", kind: "person" }],
      year: new Date().getFullYear(),
      researchType: "qualitative",
      keywords: ["research", "systems", "design"],
      programId: "40000000-0000-0000-0000-000000000001",
      adviserId: "40000000-0000-0000-0000-000000000003",
      ownerId: "40000000-0000-0000-0000-000000000004",
      status: "submitted",
    }
    const created = await request(app.getHttpServer())
      .post(createPaperContract.path)
      .set("Authorization", "Bearer owner")
      .send(input)
      .expect(201)

    expect(created.body).toMatchObject({
      title: input.title,
      publicId: expect.any(String),
      ownerId: "40000000-0000-0000-0000-000000000002",
      lockVersion: 0,
      status: "draft",
    })
    await request(app.getHttpServer())
      .get(listAdvisersContract.path)
      .set("Authorization", "Bearer owner")
      .expect(200)
      .expect([
        {
          id: "40000000-0000-0000-0000-000000000003",
          fullName: "Paper Adviser",
        },
      ])
    const publicId = created.body.publicId as string
    await request(app.getHttpServer())
      .get(`/papers/get-for-management/${publicId}`)
      .set("Authorization", "Bearer adviser")
      .expect(200)
    await request(app.getHttpServer())
      .get(`/papers/get-for-management/${publicId}`)
      .set("Authorization", "Bearer other")
      .expect(404)

    const update = {
      ...input,
      title: "An updated research title",
      expectedLockVersion: 0,
    }
    await request(app.getHttpServer())
      .patch(`/papers/update-draft/${publicId}`)
      .set("Authorization", "Bearer owner")
      .send(update)
      .expect(200)
    await request(app.getHttpServer())
      .patch(`/papers/update-draft/${publicId}`)
      .set("Authorization", "Bearer owner")
      .send(update)
      .expect(409)
    await request(app.getHttpServer())
      .delete(`/papers/delete-draft/${publicId}`)
      .set("Authorization", "Bearer other")
      .expect(404)
    await request(app.getHttpServer())
      .delete(`/papers/delete-draft/${publicId}`)
      .set("Authorization", "Bearer owner")
      .expect(200)
    expect(await db.select().from(papers)).toHaveLength(0)
    expect(await db.select().from(paperVersions)).toHaveLength(0)

    await db
      .update(programs)
      .set({ isActive: false })
      .where(eq(programs.id, "40000000-0000-0000-0000-000000000001"))
    const inactiveProgram = await request(app.getHttpServer())
      .post(createPaperContract.path)
      .set("Authorization", "Bearer owner")
      .send({ ...input, ownerId: undefined, status: undefined })
      .expect(400)
    expect(inactiveProgram.body.code).toBe("INVALID_PROGRAM")
  })
})
