import "reflect-metadata"
import type { INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { getCurrentDepositNoticeContract, getSettingsContract, publishDepositNoticeContract, updateSettingsContract } from "@repo/contracts"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { AppModule } from "../src/app.module"
import type { Database } from "../src/database/database"
import { DATABASE_CONNECTION } from "../src/database/database.module"
import { runMigrations } from "../src/database/migrate"
import { auditEvents, depositNotices, profiles, programs } from "../src/database/schema"
import { TOKEN_VERIFIER, type TokenVerifier } from "../src/modules/account/application/token-verifier.interface"

const verifier: TokenVerifier = {
  async verify(token) {
    if (token === "admin") return { clerkUserId: "settings-admin", email: "admin@ncf.edu.ph" }
    if (token === "member") return { clerkUserId: "settings-member", email: "member@ncf.edu.ph" }
    return null
  },
}

describe("Settings API", () => {
  let app: INestApplication
  let db: Database

  beforeAll(async () => {
    await runMigrations()
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verifier)
      .compile()
    app = moduleFixture.createNestApplication()
    await app.init()
    db = moduleFixture.get<Database>(DATABASE_CONNECTION)
  })

  afterAll(async () => { await app?.close() })

  beforeEach(async () => {
    await db.delete(auditEvents)
    await db.delete(depositNotices)
    await db.delete(profiles)
    await db.delete(programs)
    await db.insert(profiles).values([
      { id: "30000000-0000-0000-0000-000000000001", clerkUserId: "settings-admin", fullName: "Admin", email: "admin@ncf.edu.ph", role: "admin" },
      { id: "30000000-0000-0000-0000-000000000002", clerkUserId: "settings-member", fullName: "Member", email: "member@ncf.edu.ph" },
    ])
  })

  it("returns seeded settings and rejects invalid writes with authored validation", async () => {
    await request(app.getHttpServer()).get(getSettingsContract.path).set("Authorization", "Bearer admin").expect(200).expect({
      defaultAccessGrantDays: 7, maximumAccessGrantDays: 30, pendingRequestDays: 14, institutionName: "Naga College Foundation",
    })
    const invalid = await request(app.getHttpServer()).patch(updateSettingsContract.path).set("Authorization", "Bearer admin").send({
      defaultAccessGrantDays: 31, maximumAccessGrantDays: 30, pendingRequestDays: 14, institutionName: "NCF",
    }).expect(400)
    expect(JSON.stringify(invalid.body)).toContain("Default Access Grant length cannot exceed the maximum.")
    await request(app.getHttpServer()).get(getSettingsContract.path).set("Authorization", "Bearer member").expect(403)
  })

  it("versions published Notices and audits each publication", async () => {
    for (const text of ["First notice", "Updated notice"]) {
      await request(app.getHttpServer()).post(publishDepositNoticeContract.path).set("Authorization", "Bearer admin").send({ text }).expect(201)
    }
    await request(app.getHttpServer()).get(getCurrentDepositNoticeContract.path).set("Authorization", "Bearer member").expect(200).expect((res) => {
      expect(res.body).toMatchObject({ version: 2, text: "Updated notice" })
    })
    expect(await db.select().from(depositNotices)).toHaveLength(2)
    expect(await db.select().from(auditEvents)).toHaveLength(2)
  })
})
