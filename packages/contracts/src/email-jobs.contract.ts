import { z } from 'zod';
import { successEnvelope } from './envelope.js';

export const failedEmailJobSchema = z.object({
  id: z.uuid(),
  event: z.string(),
  recipientEmail: z.email(),
  recipientName: z.string(),
  paperPublicId: z.string(),
  paperTitle: z.string(),
  attempts: z.number().int(),
  lastError: z.string().nullable(),
  createdAt: z.string(),
});

export const listFailedEmailJobsContract = {
  method: 'GET' as const,
  path: '/email-jobs/get-failures' as const,
  response: successEnvelope(z.array(failedEmailJobSchema)),
};

export const retryEmailJobContract = {
  method: 'POST' as const,
  path: '/email-jobs/retry/:jobId' as const,
  response: successEnvelope(z.object({ retried: z.literal(true) })),
};
