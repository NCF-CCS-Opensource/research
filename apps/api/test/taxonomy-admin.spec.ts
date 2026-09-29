import "reflect-metadata"
import type { INestApplication } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import {
  createCategoryContract,
  createKeywordContract,
  createProgramContract,
  deleteCategoryContract,
  deleteKeywordContract,
  deleteProgramContract,
  listCategoriesContract,
  listKeywordsContract,
  listProgramsContract,
  renameCategoryContract,
  renameKeywordContract,
  renameProgramContract,
} from "@repo/contracts"
import { eq } from "drizzle-orm"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { AppModule } from "../src/app.module"
import type { Database } from "../src/database/database"
import { DATABASE_CONNECTION } from "../src/database/database.module"
import { runMigrations } from "../src/database/migrate"
import {
  categories,
  keywords,
  profiles,
  programs,
} from "../src/database/schema"
import {
  TOKEN_VERIFIER,
  type TokenVerifier,
  type VerifiedIdentity,
} from "../src/modules/account/application/token-verifier.interface"

const IDENTITIES: Record<string, VerifiedIdentity> = {
  "token-admin": { clerkUserId: "clerk_admin", email: "admin@ncf.edu.ph" },
  "token-user": { clerkUserId: "clerk_user", email: "user@ncf.edu.ph" },
}

const fakeTokenVerifier: TokenVerifier = {
  async verify(token: string) {
    return IDENTITIES[token] ?? null
  },
}

const ADMIN = "Bearer token-admin"
const USER = "Bearer token-user"
const MISSING_ID = "99999999-9999-9999-9999-999999999999"

const lists = [
  {
    label: "Category",
    table: categories,
    create: createCategoryContract,
    rename: renameCategoryContract,
    remove: deleteCategoryContract,
    list: listCategoriesContract,
  },
  {
    label: "Keyword",
    table: keywords,
    create: createKeywordContract,
    rename: renameKeywordContract,
    remove: deleteKeywordContract,
    list: listKeywordsContract,
  },
  {
    label: "Program",
    table: programs,
    create: createProgramContract,
    rename: renameProgramContract,
    remove: deleteProgramContract,
    list: listProgramsContract,
  },
] as const

describe("Taxonomy administration", () => {
  let app: INestApplication
  let db: Database

  beforeAll(async () => {
    await runMigrations()
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(fakeTokenVerifier)
      .compile()
    app = moduleFixture.createNestApplication()
    await app.init()
    db = moduleFixture.get<Database>(DATABASE_CONNECTION)
  })

  afterAll(async () => {
    await app?.close()
  })

  beforeEach(async () => {
    await db.delete(profiles)
    await db.delete(categories)
    await db.delete(keywords)
    await db.delete(programs)
    await db.insert(profiles).values([
      {
        clerkUserId: "clerk_admin",
        fullName: "Admin",
        email: "admin@ncf.edu.ph",
        role: "admin",
      },
      {
        clerkUserId: "clerk_user",
        fullName: "User",
        email: "user@ncf.edu.ph",
      },
    ])
  })

  const post = (
    contract: { path: string },
    auth: string | null,
    body: object
  ) => {
    const req = request(app.getHttpServer()).post(contract.path)
    return (auth ? req.set("Authorization", auth) : req).send(body)
  }

  describe.each(lists)("$label list", (l) => {
    it("lets an Admin create, rename, and delete an entry", async () => {
      const created = await post(l.create, ADMIN, { name: "  Biology " }).expect(
        201
      )
      expect(created.body).toMatchObject({ name: "Biology" })
      const id = created.body.id

      const renamed = await post(l.rename, ADMIN, {
        id,
        name: "Marine Biology",
      }).expect(201)
      expect(renamed.body).toEqual({ id, name: "Marine Biology" })

      const listed = await request(app.getHttpServer())
        .get(l.list.path)
        .expect(200)
      expect(listed.body).toEqual([{ id, name: "Marine Biology" }])

      await post(l.remove, ADMIN, { id }).expect(201)
      const after = await request(app.getHttpServer())
        .get(l.list.path)
        .expect(200)
      expect(after.body).toEqual([])
    })

    it("rejects a duplicate name on create, ignoring case, with an authored message", async () => {
      await post(l.create, ADMIN, { name: "Biology" }).expect(201)
      const res = await post(l.create, ADMIN, { name: "biology" }).expect(409)
      expect(res.body).toEqual({
        code: "DUPLICATE_TAXONOMY_NAME",
        message: `A ${l.label} named "biology" already exists.`,
      })
    })

    it("rejects renaming onto another entry's name but allows changing the case of its own", async () => {
      await post(l.create, ADMIN, { name: "Biology" }).expect(201)
      const other = await post(l.create, ADMIN, {
        name: "Chemistry",
      }).expect(201)

      await post(l.rename, ADMIN, {
        id: other.body.id,
        name: "BIOLOGY",
      }).expect(409)
      await post(l.rename, ADMIN, {
        id: other.body.id,
        name: "CHEMISTRY",
      }).expect(201)
    })

    it("rejects a blank name with a field message", async () => {
      const res = await post(l.create, ADMIN, { name: "   " }).expect(400)
      expect(JSON.stringify(res.body)).toContain("Name is required")
    })

    it("reports 404 when renaming or deleting an unknown entry", async () => {
      await post(l.rename, ADMIN, { id: MISSING_ID, name: "X" }).expect(404)
      await post(l.remove, ADMIN, { id: MISSING_ID }).expect(404)
    })

    it("rejects everyone except Admins on every change", async () => {
      const [row] = await db
        .insert(l.table)
        .values({ name: "Existing" })
        .returning()
      const bodies = [
        [l.create, { name: "New" }],
        [l.rename, { id: row.id, name: "Renamed" }],
        [l.remove, { id: row.id }],
      ] as const

      for (const [contract, body] of bodies) {
        await post(contract, null, body).expect(401)
        await post(contract, USER, body).expect(403)
      }
      const rows = await db
        .select()
        .from(l.table)
        .where(eq(l.table.id, row.id))
      expect(rows).toEqual([{ id: row.id, name: "Existing" }])
    })
  })

  it("clears a deleted Program from every Profile that referenced it", async () => {
    const [program] = await db
      .insert(programs)
      .values({ name: "BS Biology" })
      .returning()
    await db
      .update(profiles)
      .set({ programId: program.id })
      .where(eq(profiles.clerkUserId, "clerk_user"))

    await post(deleteProgramContract, ADMIN, { id: program.id }).expect(201)

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.clerkUserId, "clerk_user"))
    expect(profile.programId).toBeNull()
  })

  it("serves the Keyword list publicly, ordered by name", async () => {
    await db.insert(keywords).values([{ name: "zebra" }, { name: "apple" }])
    const res = await request(app.getHttpServer())
      .get(listKeywordsContract.path)
      .expect(200)
    expect(res.body.map((k: { name: string }) => k.name)).toEqual([
      "apple",
      "zebra",
    ])
  })
})
