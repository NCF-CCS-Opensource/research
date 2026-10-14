import { z } from 'zod';
import { successEnvelope } from './envelope.js';

export const auditEventSchema = z.object({
  id: z.uuid(),
  occurredAt: z.string(),
  actorAccountId: z.uuid().nullable(),
  actorName: z.string().nullable(),
  action: z.string(),
  subjectType: z.string(),
  subjectId: z.uuid(),
  details: z.unknown(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const AUDIT_PAGE_SIZE = 50;

export const listAuditEventsQuerySchema = z.object({
  actorId: z.uuid().optional(),
  action: z.string().trim().min(1).optional(),
  subjectId: z.uuid().optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
});
export type ListAuditEventsQuery = z.infer<typeof listAuditEventsQuerySchema>;

export const listAuditEventsContract = {
  method: 'GET' as const,
  path: '/audit/list' as const,
  query: listAuditEventsQuerySchema,
  response: successEnvelope(
    z.object({
      items: z.array(auditEventSchema),
      page: z.number(),
      pageSize: z.number(),
      hasMore: z.boolean(),
    }),
  ),
};
