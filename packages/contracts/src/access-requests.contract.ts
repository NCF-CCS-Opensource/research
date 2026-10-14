import { z } from 'zod';

const requestSummarySchema = z.object({
  id: z.string().uuid(),
  publicId: z.string(),
  paperTitle: z.string(),
  purpose: z.string(),
  status: z.enum(['pending', 'approved', 'denied', 'cancelled', 'expired']),
  expiresAt: z.string().datetime(),
  decisionReason: z.string().nullable(),
  grantExpiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export const requestPaperAccessContract = {
  method: 'POST' as const,
  path: '/access-requests/:publicId' as const,
  request: z.object({ purpose: z.string().trim().min(30).max(1500) }),
  response: requestSummarySchema,
};
export const cancelPaperAccessRequestContract = {
  method: 'POST' as const,
  path: '/access-requests/cancel/:requestId' as const,
  response: z.object({ cancelled: z.literal(true) }),
};
export const listMyAccessRequestsContract = {
  method: 'GET' as const,
  path: '/access-requests/mine' as const,
  response: z.array(requestSummarySchema),
};
export const listAccessRequestQueueContract = {
  method: 'GET' as const,
  path: '/access-requests/queue' as const,
  response: z.array(
    requestSummarySchema.extend({
      requesterName: z.string(),
      requesterRole: z.string(),
      program: z.string().nullable(),
      defaultGrantDays: z.number().int().positive(),
      maximumGrantDays: z.number().int().positive(),
      earlierDecisions: z.array(
        z.object({
          decision: z.enum(['approved', 'denied', 'cancelled', 'expired']),
          reason: z.string().nullable(),
          decidedAt: z.string().datetime(),
        }),
      ),
    }),
  ),
};
export const decidePaperAccessRequestContract = {
  method: 'POST' as const,
  path: '/access-requests/decide/:requestId' as const,
  request: z.discriminatedUnion('decision', [
    z.object({
      decision: z.literal('approve'),
      days: z.number().int().positive(),
    }),
    z.object({
      decision: z.literal('deny'),
      reason: z.string().trim().min(1).max(2000),
    }),
  ]),
  response: requestSummarySchema,
};
export const checkPaperAccessContract = {
  method: 'GET' as const,
  path: '/access-grants/check/:publicId' as const,
  response: z.object({
    state: z.enum([
      'guest',
      'eligible',
      'pending',
      'approved',
      'denied',
      'expired',
      'cancelled',
      'unavailable',
      'management',
    ]),
    expiresAt: z.string().datetime().nullable(),
    reason: z.string().nullable(),
    requestId: z.string().uuid().nullable(),
  }),
};
