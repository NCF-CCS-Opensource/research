import { Injectable, NotFoundException } from "@nestjs/common"
import { desc, eq } from "drizzle-orm"
import type { Database } from "../../database/database"
import { DATABASE_CONNECTION } from "../../database/database.module"
import { auditEvents, depositNotices, programs, settings } from "../../database/schema"
import { Inject } from "@nestjs/common"
import type { Settings, UpdateSettingsRequest } from "@repo/contracts"

@Injectable()
export class SettingsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async getSettings(): Promise<Settings> {
    const [row] = await this.db.select().from(settings).where(eq(settings.id, 1))
    if (!row) throw new NotFoundException("Repository settings are unavailable.")
    return {
      defaultAccessGrantDays: row.defaultAccessGrantDays,
      maximumAccessGrantDays: row.maximumAccessGrantDays,
      pendingRequestDays: row.pendingRequestDays,
      institutionName: row.institutionName,
    }
  }

  async updateSettings(actorId: string, value: UpdateSettingsRequest): Promise<Settings> {
    return this.db.transaction(async (tx) => {
      const [old] = await tx.select().from(settings).where(eq(settings.id, 1)).for("update")
      if (!old) throw new NotFoundException("Repository settings are unavailable.")
      const next = {
        defaultAccessGrantDays: value.defaultAccessGrantDays,
        maximumAccessGrantDays: value.maximumAccessGrantDays,
        pendingRequestDays: value.pendingRequestDays,
        institutionName: value.institutionName,
      }
      for (const key of Object.keys(next) as (keyof typeof next)[]) {
        if (old[key] !== next[key]) {
          await tx.insert(auditEvents).values({
            actorProfileId: actorId,
            action: `settings.${key}.updated`,
            entityId: "settings",
            oldValue: { [key]: old[key] },
            newValue: { [key]: next[key] },
          })
        }
      }
      await tx.update(settings).set(next).where(eq(settings.id, 1))
      return next
    })
  }

  async currentDepositNotice() {
    const [row] = await this.db.select().from(depositNotices).orderBy(desc(depositNotices.version)).limit(1)
    return row ? { version: row.version, text: row.text, publishedAt: row.publishedAt.toISOString() } : null
  }

  async publishDepositNotice(actorId: string, text: string) {
    return this.db.transaction(async (tx) => {
      const [old] = await tx.select().from(depositNotices).orderBy(desc(depositNotices.version)).limit(1).for("update")
      const [row] = await tx.insert(depositNotices).values({ text, publishedBy: actorId }).returning()
      await tx.insert(auditEvents).values({
        actorProfileId: actorId,
        action: "deposit_notice.published",
        entityId: row.id,
        oldValue: old ? { version: old.version, text: old.text } : null,
        newValue: { version: row.version, text: row.text },
      })
      return { version: row.version, text: row.text, publishedAt: row.publishedAt.toISOString() }
    })
  }

  async createProgram(actorId: string, name: string) {
    const [row] = await this.db.transaction(async (tx) => {
      const inserted = await tx.insert(programs).values({ name, isActive: true }).returning()
      await tx.insert(auditEvents).values({ actorProfileId: actorId, action: "program.created", entityId: inserted[0].id, oldValue: null, newValue: { name, active: true } })
      return inserted
    })
    return row
  }

  async updateProgram(actorId: string, id: string, name: string, active: boolean) {
    return this.db.transaction(async (tx) => {
      const [old] = await tx.select().from(programs).where(eq(programs.id, id)).for("update")
      if (!old) throw new NotFoundException("Program not found.")
      const next = { name, isActive: active }
      await tx.update(programs).set(next).where(eq(programs.id, id))
      await tx.insert(auditEvents).values({ actorProfileId: actorId, action: "program.updated", entityId: id, oldValue: { name: old.name, active: old.isActive }, newValue: { name, active } })
      return { id, name, isActive: active }
    })
  }
}
