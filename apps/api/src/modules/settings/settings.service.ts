import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../database/database.js';
import { DATABASE } from '../../database/database.module.js';
import {
  auditEvents,
  depositNotices,
  programs,
  settings,
} from '../../database/schema/index.js';
import { Inject } from '@nestjs/common';
import type { Settings, UpdateSettingsRequest } from '@repo/contracts';

@Injectable()
export class SettingsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getSettings(): Promise<Settings> {
    const [row] = await this.db
      .select()
      .from(settings)
      .where(eq(settings.id, 1));
    if (!row)
      throw new NotFoundException('Repository settings are unavailable.');
    return {
      defaultAccessGrantDays: row.defaultAccessGrantDays,
      maximumAccessGrantDays: row.maximumAccessGrantDays,
      pendingRequestDays: row.pendingRequestDays,
      institutionName: row.institutionName,
    };
  }

  async updateSettings(
    actorId: string,
    value: UpdateSettingsRequest,
  ): Promise<Settings> {
    return this.db.transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(settings)
        .where(eq(settings.id, 1))
        .for('update');
      if (!old)
        throw new NotFoundException('Repository settings are unavailable.');
      const next = {
        defaultAccessGrantDays: value.defaultAccessGrantDays,
        maximumAccessGrantDays: value.maximumAccessGrantDays,
        pendingRequestDays: value.pendingRequestDays,
        institutionName: value.institutionName,
      };
      for (const key of Object.keys(next) as (keyof typeof next)[]) {
        if (old[key] !== next[key]) {
          await tx.insert(auditEvents).values({
            actorAccountId: actorId,
            action: `settings.${key}.updated`,
            subjectType: 'settings',
            subjectId: actorId,
            details: {
              oldValue: { [key]: old[key] },
              newValue: { [key]: next[key] },
            },
          });
        }
      }
      await tx.update(settings).set(next).where(eq(settings.id, 1));
      return next;
    });
  }

  async currentDepositNotice() {
    const [row] = await this.db
      .select()
      .from(depositNotices)
      .orderBy(desc(depositNotices.version))
      .limit(1);
    return row
      ? {
          version: row.version,
          text: row.text,
          publishedAt: row.publishedAt.toISOString(),
        }
      : null;
  }

  async listDepositNotices() {
    const rows = await this.db
      .select()
      .from(depositNotices)
      .orderBy(desc(depositNotices.version));
    return rows.map(({ version, text, publishedAt }) => ({
      version,
      text,
      publishedAt: publishedAt.toISOString(),
    }));
  }

  async publishDepositNotice(actorId: string, text: string) {
    return this.db.transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(depositNotices)
        .orderBy(desc(depositNotices.version))
        .limit(1)
        .for('update');
      const [row] = await tx
        .insert(depositNotices)
        .values({ text, publishedBy: actorId })
        .returning();
      await tx.insert(auditEvents).values({
        actorAccountId: actorId,
        action: 'deposit_notice.published',
        subjectType: 'deposit_notice',
        subjectId: row.id,
        details: {
          oldValue: old ? { version: old.version, text: old.text } : null,
          newValue: { version: row.version, text: row.text },
        },
      });
      return {
        version: row.version,
        text: row.text,
        publishedAt: row.publishedAt.toISOString(),
      };
    });
  }

  async createProgram(actorId: string, name: string) {
    try {
      const [row] = await this.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(programs)
          .values({ name, active: true })
          .returning();
        await tx
          .insert(auditEvents)
          .values({
            actorAccountId: actorId,
            action: 'program.created',
            subjectType: 'program',
            subjectId: inserted.id,
            details: { oldValue: null, newValue: { name, active: true } },
          });
        return [inserted];
      });
      return row;
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('A Program with this name already exists.');
      throw error;
    }
  }

  async updateProgram(
    actorId: string,
    id: string,
    name: string,
    active: boolean,
  ) {
    try {
      return await this.db.transaction(async (tx) => {
        const [old] = await tx
          .select()
          .from(programs)
          .where(eq(programs.id, id))
          .for('update');
        if (!old) throw new NotFoundException('Program not found.');
        const next = { name, active };
        await tx.update(programs).set(next).where(eq(programs.id, id));
        await tx
          .insert(auditEvents)
          .values({
            actorAccountId: actorId,
            action: 'program.updated',
            subjectType: 'program',
            subjectId: id,
            details: {
              oldValue: { name: old.name, active: old.active },
              newValue: { name, active },
            },
          });
        return { id, name, active };
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException('A Program with this name already exists.');
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  // Drizzle wraps Postgres errors; uniqueness details live on its cause.
  const cause = error instanceof Error ? (error.cause ?? error) : error;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    (cause as { code?: string }).code === '23505' &&
    (cause as { constraint_name?: string }).constraint_name ===
      'programs_name_unique'
  );
}
