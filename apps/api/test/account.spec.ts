import "reflect-metadata"
import { Controller, Get, type INestApplication } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { getCurrentAccountContract, registerContract } from "@repo/contracts"
import { eq } from "drizzle-orm"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { AppModule } from "../src/app.module"
import { AdminOnly } from "../src/common/decorators/admin-only.decorator"
import type { Database } from "../src/database/database"
import { DATABASE_CONNECTION } from "../src/database/database.module"
import { runMigrations } from "../src/database/migrate"
import { profiles, programs } from "../src/database/schema"
import {
  TOKEN_VERIFIER,
  type TokenVerifier,
  type VerifiedIdentity,
} from "../src/modules/account/application/token-verifier.interface"
import { Profile } from "../src/modules/account/domain/profile.entity"
import {
  EmailDomainNotAllowedError,
} from "../src/modules/account/domain/profile.errors"

const FAKE_IDENTITIES: Record<string, VerifiedIdentity> = {
  "token-registering-1": {
    clerkUserId: "clerk_registering_1",
    email: "first.student@gbox.ncf.edu.ph",
  },
  "token-registering-2": {
    clerkUserId: "clerk_registering_2",
    email: "second.student@ncf.edu.ph",
  },
  "token-registering-3": {
    clerkUserId: "clerk_registering_3",
    email: "third.student@gbox.ncf.edu.ph",
  },
  "token-active": {
    clerkUserId: "clerk_active",
    email: "active.user@ncf.edu.ph",
  },
  "token-active-new-email": {
    clerkUserId: "clerk_active",
    email: "active.newmail@ncf.edu.ph",
  },
  "token-suspended": {
    clerkUserId: "clerk_suspended",
    email: "suspended.user@ncf.edu.ph",
  },
  "token-admin": {
    clerkUserId: "clerk_admin",
    email: "admin.user@ncf.edu.ph",
  },
  "token-outside-domain": {
    clerkUserId: "clerk_outside",
    email: "someone@gmail.com",
  },
}

const fakeTokenVerifier: TokenVerifier = {
  async verify(token: string) {
    return FAKE_IDENTITIES[token] ?? null
  },
}

@Controller()
class TestHarnessController {
  @Get("/test-protected-route")
  protectedRoute() {
    return { ok: true }
  }

  @AdminOnly()
  @Get("/test-admin-route")
  adminRoute() {
    return { ok: true }
  }
}

describe("Account module", () => {
  let app: INestApplication
  let db: Database

  beforeAll(async () => {
    await runMigrations()

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestHarnessController],
    })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(fakeTokenVerifier)
      .compile()

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
    await db.delete(profiles)
    await db.delete(programs)
  })

  describe("Global guard identity states", () => {
    it("rejects a request with no token as a guest", async () => {
      const res = await request(app.getHttpServer())
        .get("/test-protected-route")
        .expect(401)

      expect(res.body).toMatchObject({ message: "Authentication required" })
    })

    it("rejects a signed-in person without a Profile on a non-Registering route", async () => {
      const res = await request(app.getHttpServer())
        .get("/test-protected-route")
        .set("Authorization", "Bearer token-registering-1")
        .expect(403)

      expect(res.body).toEqual({
        code: "REGISTRATION_REQUIRED",
        message: "Complete registration before continuing.",
      })
    })

    it("allows an Active User through a plain protected route", async () => {
      await db.insert(profiles).values({
        id: "30000000-0000-0000-0000-000000000001",
        clerkUserId: "clerk_active",
        fullName: "Active User",
        email: "active.user@ncf.edu.ph",
        role: "user",
        status: "active",
      })

      const res = await request(app.getHttpServer())
        .get("/test-protected-route")
        .set("Authorization", "Bearer token-active")
        .expect(200)

      expect(res.body).toEqual({ ok: true })
    })

    it("rejects a suspended account with 403 ACCOUNT_SUSPENDED on a non-public route", async () => {
      await db.insert(profiles).values({
        id: "30000000-0000-0000-0000-000000000002",
        clerkUserId: "clerk_suspended",
        fullName: "Suspended User",
        email: "suspended.user@ncf.edu.ph",
        role: "user",
        status: "suspended",
      })

      const res = await request(app.getHttpServer())
        .get("/test-protected-route")
        .set("Authorization", "Bearer token-suspended")
        .expect(403)

      expect(res.body).toEqual({
        code: "ACCOUNT_SUSPENDED",
        message: "This account has been suspended.",
      })
    })

    it("rejects a non-admin Active User on an Admin-only route", async () => {
      await db.insert(profiles).values({
        id: "30000000-0000-0000-0000-000000000001",
        clerkUserId: "clerk_active",
        fullName: "Active User",
        email: "active.user@ncf.edu.ph",
        role: "user",
        status: "active",
      })

      const res = await request(app.getHttpServer())
        .get("/test-admin-route")
        .set("Authorization", "Bearer token-active")
        .expect(403)

      expect(res.body).toEqual({
        code: "ADMIN_ONLY",
        message: "This action requires an administrator.",
      })
    })

    it("allows an Admin through an Admin-only route", async () => {
      await db.insert(profiles).values({
        id: "30000000-0000-0000-0000-000000000003",
        clerkUserId: "clerk_admin",
        fullName: "Admin User",
        email: "admin.user@ncf.edu.ph",
        role: "admin",
        status: "active",
      })

      const res = await request(app.getHttpServer())
        .get("/test-admin-route")
        .set("Authorization", "Bearer token-admin")
        .expect(200)

      expect(res.body).toEqual({ ok: true })
    })
  })

  describe("Register endpoint (POST /account/register)", () => {
    it("rejects a request with no token", async () => {
      await request(app.getHttpServer())
        .post(registerContract.path)
        .send({ fullName: "Nobody" })
        .expect(401)
    })

    it("saves a Profile with the full name and the token's email when no Program is given", async () => {
      const res = await request(app.getHttpServer())
        .post(registerContract.path)
        .set("Authorization", "Bearer token-registering-1")
        .send({ fullName: "First Student" })
        .expect(201)

      expect(res.body).toEqual({
        id: expect.any(String),
        fullName: "First Student",
        email: "first.student@gbox.ncf.edu.ph",
        programId: null,
        role: "user",
        status: "active",
      })

      const [row] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.clerkUserId, "clerk_registering_1"))
      expect(row?.email).toBe("first.student@gbox.ncf.edu.ph")
    })

    it("rejects emails outside gbox.ncf.edu.ph and ncf.edu.ph with an authored message", async () => {
      const res = await request(app.getHttpServer())
        .post(registerContract.path)
        .set("Authorization", "Bearer token-outside-domain")
        .send({ fullName: "Outsider" })
        .expect(400)

      expect(res.body).toEqual({
        code: "EMAIL_DOMAIN_NOT_ALLOWED",
        message: "Only NCF Google Accounts (gbox.ncf.edu.ph or ncf.edu.ph) may register.",
      })

      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.clerkUserId, "clerk_outside"))
      expect(rows).toHaveLength(0)
    })

    it("rejects a Program ID that is not in the maintained list", async () => {
      const res = await request(app.getHttpServer())
        .post(registerContract.path)
        .set("Authorization", "Bearer token-registering-2")
        .send({
          fullName: "Second Student",
          programId: "40000000-0000-0000-0000-000000000099",
        })
        .expect(400)

      expect(res.body).toEqual({
        code: "PROGRAM_NOT_FOUND",
        message: "Select a Program from the list.",
      })
    })

    it("saves the listed Program when it exists", async () => {
      await db.insert(programs).values({
        id: "40000000-0000-0000-0000-000000000001",
        name: "Computer Science",
      })

      const res = await request(app.getHttpServer())
        .post(registerContract.path)
        .set("Authorization", "Bearer token-registering-3")
        .send({
          fullName: "Third Student",
          programId: "40000000-0000-0000-0000-000000000001",
        })
        .expect(201)

      expect(res.body).toMatchObject({
        programId: "40000000-0000-0000-0000-000000000001",
      })
    })

    it("rejects an identity that already has a Profile, without creating a second one", async () => {
      await db.insert(profiles).values({
        id: "30000000-0000-0000-0000-000000000001",
        clerkUserId: "clerk_active",
        fullName: "Active User",
        email: "active.user@ncf.edu.ph",
        role: "user",
        status: "active",
      })

      const res = await request(app.getHttpServer())
        .post(registerContract.path)
        .set("Authorization", "Bearer token-active")
        .send({ fullName: "Active User Again" })
        .expect(409)

      expect(res.body).toEqual({
        code: "PROFILE_ALREADY_EXISTS",
        message: "This account has already completed Registration.",
      })

      const rows = await db
        .select()
        .from(profiles)
        .where(eq(profiles.clerkUserId, "clerk_active"))
      expect(rows).toHaveLength(1)
    })
  })

  describe("Current-account endpoint (GET /account/get-current-account)", () => {
    it("rejects a request with no token", async () => {
      await request(app.getHttpServer())
        .get(getCurrentAccountContract.path)
        .expect(401)
    })

    it("reports registering for a signed-in person without a Profile", async () => {
      const res = await request(app.getHttpServer())
        .get(getCurrentAccountContract.path)
        .set("Authorization", "Bearer token-registering-1")
        .expect(200)

      expect(res.body).toEqual({ status: "registering" })
    })

    it("reports active with role for an Active User", async () => {
      await db.insert(profiles).values({
        id: "30000000-0000-0000-0000-000000000001",
        clerkUserId: "clerk_active",
        fullName: "Active User",
        email: "active.user@ncf.edu.ph",
        role: "user",
        status: "active",
      })

      const res = await request(app.getHttpServer())
        .get(getCurrentAccountContract.path)
        .set("Authorization", "Bearer token-active")
        .expect(200)

      expect(res.body).toEqual({ status: "active", role: "user" })
    })

    it("reports suspended with role for a suspended account, without blocking it", async () => {
      await db.insert(profiles).values({
        id: "30000000-0000-0000-0000-000000000002",
        clerkUserId: "clerk_suspended",
        fullName: "Suspended User",
        email: "suspended.user@ncf.edu.ph",
        role: "user",
        status: "suspended",
      })

      const res = await request(app.getHttpServer())
        .get(getCurrentAccountContract.path)
        .set("Authorization", "Bearer token-suspended")
        .expect(200)

      expect(res.body).toEqual({ status: "suspended", role: "user" })
    })

    it("updates the Profile email when the token's email claim differs", async () => {
      await db.insert(profiles).values({
        id: "30000000-0000-0000-0000-000000000001",
        clerkUserId: "clerk_active",
        fullName: "Active User",
        email: "active.user@ncf.edu.ph",
        role: "user",
        status: "active",
      })

      await request(app.getHttpServer())
        .get(getCurrentAccountContract.path)
        .set("Authorization", "Bearer token-active-new-email")
        .expect(200)

      const [row] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.clerkUserId, "clerk_active"))
      expect(row?.email).toBe("active.newmail@ncf.edu.ph")
    })
  })

  describe("Profile domain entity", () => {
    it("registers a Profile as an active User with a generated ID", () => {
      const profile = Profile.register({
        clerkUserId: "clerk_x",
        fullName: "  Jane Student  ",
        email: "jane@gbox.ncf.edu.ph",
        programId: null,
      })

      expect(profile.id).toEqual(expect.any(String))
      expect(profile.fullName).toBe("Jane Student")
      expect(profile.role).toBe("user")
      expect(profile.status).toBe("active")
    })

    it("throws EmailDomainNotAllowedError for a non-NCF email", () => {
      expect(() =>
        Profile.register({
          clerkUserId: "clerk_y",
          fullName: "Someone",
          email: "someone@gmail.com",
          programId: null,
        })
      ).toThrow(EmailDomainNotAllowedError)
    })
  })
})
