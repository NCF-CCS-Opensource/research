import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { DATABASE } from '../../../database/database.module.js';
import type { Database } from '../../../database/database.js';
import { accounts, auditEvents } from '../../../database/schema/index.js';
import type { AuditReader } from '../application/audit-reader.js';

@Injectable()
export class DrizzleAuditReader implements AuditReader {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async find(
    filter: Parameters<AuditReader['find']>[0],
    { limit, offset }: { limit: number; offset: number },
  ) {
    const rows = await this.db
      .select({
        id: auditEvents.id,
        occurredAt: auditEvents.occurredAt,
        actorAccountId: auditEvents.actorAccountId,
        actorName: accounts.name,
        action: auditEvents.action,
        subjectType: auditEvents.subjectType,
        subjectId: auditEvents.subjectId,
        details: auditEvents.details,
      })
      .from(auditEvents)
      .leftJoin(accounts, eq(accounts.id, auditEvents.actorAccountId))
      .where(
        and(
          filter.actorId
            ? eq(auditEvents.actorAccountId, filter.actorId)
            : undefined,
          filter.action ? eq(auditEvents.action, filter.action) : undefined,
          filter.subjectId
            ? eq(auditEvents.subjectId, filter.subjectId)
            : undefined,
          filter.from
            ? gte(auditEvents.occurredAt, new Date(filter.from))
            : undefined,
          filter.to
            ? lte(auditEvents.occurredAt, new Date(filter.to))
            : undefined,
        ),
      )
      .orderBy(desc(auditEvents.occurredAt), desc(auditEvents.id))
      .limit(limit)
      .offset(offset);
    return rows.map((row) => ({
      ...row,
      occurredAt: row.occurredAt.toISOString(),
    }));
  }
}
