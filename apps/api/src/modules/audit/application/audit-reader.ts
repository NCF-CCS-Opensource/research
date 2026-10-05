import type { AuditEvent, ListAuditEventsQuery } from '@repo/contracts';

export const AUDIT_READER = Symbol('AUDIT_READER');

export interface AuditReader {
  /** Newest first. Returns up to `limit` events from `offset`. */
  find(
    filter: Omit<ListAuditEventsQuery, 'page'>,
    window: { limit: number; offset: number },
  ): Promise<AuditEvent[]>;
}
