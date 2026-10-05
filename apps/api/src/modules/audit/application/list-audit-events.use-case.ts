import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_PAGE_SIZE, type ListAuditEventsQuery } from '@repo/contracts';
import {
  requireCoordinator,
  type Actor,
} from '../../../shared/domain/actor.js';
import { AUDIT_READER, type AuditReader } from './audit-reader.js';

@Injectable()
export class ListAuditEventsUseCase {
  constructor(@Inject(AUDIT_READER) private readonly audit: AuditReader) {}

  async execute({ page, ...filter }: ListAuditEventsQuery, actor: Actor) {
    requireCoordinator(actor);
    // One extra row tells us whether another page exists.
    const rows = await this.audit.find(filter, {
      limit: AUDIT_PAGE_SIZE + 1,
      offset: (page - 1) * AUDIT_PAGE_SIZE,
    });
    return {
      items: rows.slice(0, AUDIT_PAGE_SIZE),
      page,
      pageSize: AUDIT_PAGE_SIZE,
      hasMore: rows.length > AUDIT_PAGE_SIZE,
    };
  }
}
