import { z } from 'zod';

const paper = z.object({
  publicId: z.string(),
  title: z.string(),
  status: z.enum([
    'draft',
    'submitted',
    'endorsed',
    'revision_requested',
    'rejected',
  ]),
  publicationStatus: z.enum(['unpublished', 'published', 'withdrawn']),
});
const request = z.object({
  id: z.string().uuid(),
  publicId: z.string(),
  paperTitle: z.string(),
  status: z.enum(['pending', 'approved', 'denied', 'cancelled', 'expired']),
  createdAt: z.string().datetime(),
  requesterName: z.string().optional(),
});
const grant = z.object({
  id: z.string().uuid(),
  publicId: z.string(),
  paperTitle: z.string(),
  expiresAt: z.string().datetime(),
  accountName: z.string().optional(),
});
const book = z.object({
  publicId: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'submitted', 'published', 'rejected', 'withdrawn']),
});
const failedEmail = z.object({
  id: z.string().uuid(),
  event: z.string(),
  recipientName: z.string(),
  paperPublicId: z.string().nullable(),
  bookPublicId: z.string().nullable(),
  paperTitle: z.string(),
  createdAt: z.string().datetime(),
});

export const getDashboardContract = {
  method: 'GET' as const,
  path: '/dashboard/get' as const,
  response: z.discriminatedUnion('role', [
    z.object({
      role: z.literal('STUDENT'),
      papers: z.array(paper),
      books: z.array(book),
      requests: z.array(request),
      grants: z.array(grant),
    }),
    z.object({
      role: z.literal('INSTRUCTOR'),
      papers: z.array(paper),
      requests: z.array(request.extend({ requesterName: z.string() })),
      grants: z.array(grant.extend({ accountName: z.string() })),
    }),
    z.object({
      role: z.literal('COORDINATOR'),
      papers: z.array(paper),
      books: z.array(book),
      requests: z.array(
        request.extend({ ageDays: z.number().int().nonnegative() }),
      ),
      failedEmails: z.array(failedEmail),
    }),
  ]),
};
