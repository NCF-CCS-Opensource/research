import { z } from 'zod';
import { RESEARCH_TYPE_VALUES } from '../reference-data.contract.js';

export const authorSchema = z.object({
  displayName: z.string().trim().min(1, 'Author name is required').max(255),
  kind: z.enum(['person', 'organization']),
  givenName: z.string().trim().max(100).optional(),
  familyName: z.string().trim().max(100).optional(),
  suffix: z.string().trim().max(20).optional(),
});
export const paperDetailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, 'Title must be at least 10 characters')
    .max(300, 'Title must be at most 300 characters'),
  abstract: z
    .string()
    .trim()
    .min(100, 'Abstract must be at least 100 characters')
    .max(5000, 'Abstract must be at most 5,000 characters')
    .refine((value) => !/<[^>]*>/.test(value), 'Abstract must be plain text'),
  authors: z
    .array(authorSchema)
    .min(1, 'Add at least one Author')
    .max(20, 'No more than 20 Authors are allowed'),
  year: z.number().int().min(1900).max(new Date().getFullYear()),
  researchType: z.enum(RESEARCH_TYPE_VALUES),
  keywords: z
    .array(z.string().trim().min(2).max(50))
    .min(3, 'Add at least 3 keywords')
    .max(10, 'No more than 10 keywords are allowed')
    .refine(
      (values) =>
        new Set(values.map((v) => v.toLocaleLowerCase())).size ===
        values.length,
      'Keywords must be unique',
    ),
  programId: z.string().uuid(),
});
export const paperSchema = paperDetailsSchema.extend({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  publicId: z.string(),
  ownerId: z.string().uuid(),
  adviserId: z.string().uuid().nullable(),
  legacyDeposit: z.boolean(),
  status: z.enum([
    'draft',
    'submitted',
    'endorsed',
    'revision_requested',
    'rejected',
  ]),
  decisionHistory: z.array(
    z.object({
      decision: z.string(),
      reason: z.string().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
  publicationStatus: z.enum(['unpublished', 'published', 'withdrawn']),
  lockVersion: z.number().int(),
});
export type PaperDetails = z.infer<typeof paperDetailsSchema>;
export type Paper = z.infer<typeof paperSchema>;
export const createPaperContract = {
  method: 'POST' as const,
  path: '/papers/create' as const,
  request: paperDetailsSchema.extend({ adviserId: z.string().uuid() }),
  response: paperSchema,
};
export const createLegacyDepositContract = {
  method: 'POST' as const,
  path: '/papers/legacy-deposit/create' as const,
  request: paperDetailsSchema.extend({
    adviserId: z.string().uuid().nullable().optional(),
  }),
  response: paperSchema,
};
export type CreateLegacyDepositRequest = z.infer<
  typeof createLegacyDepositContract.request
>;
export type CreatePaperRequest = z.infer<typeof createPaperContract.request>;
export const listMyPapersContract = {
  method: 'GET' as const,
  path: '/papers/get-mine' as const,
  response: z.array(paperSchema),
};
export const getPaperContract = {
  method: 'GET' as const,
  path: '/papers/get-for-management/:publicId' as const,
  response: paperSchema,
};
export const updatePaperContract = {
  method: 'PATCH' as const,
  path: '/papers/update-draft/:publicId' as const,
  request: paperDetailsSchema.extend({
    adviserId: z.string().uuid(),
    expectedLockVersion: z.number().int().nonnegative(),
  }),
  response: paperSchema,
};
export type UpdatePaperRequest = z.infer<typeof updatePaperContract.request>;
export const deletePaperContract = {
  method: 'DELETE' as const,
  path: '/papers/delete-draft/:publicId' as const,
  response: z.object({ deleted: z.literal(true) }),
};
export const listAdvisersContract = {
  method: 'GET' as const,
  path: '/papers/list-selectable-advisers' as const,
  response: z.array(z.object({ id: z.string().uuid(), fullName: z.string() })),
};

export const submitPaperContract = {
  method: 'POST' as const,
  path: '/papers/submit/:publicId' as const,
  request: z.object({ noticeVersion: z.number().int().positive() }),
  response: paperSchema,
};
export const listAdviserQueueContract = {
  method: 'GET' as const,
  path: '/papers/get-adviser-queue' as const,
  response: z.array(paperSchema),
};
export const decidePaperContract = {
  method: 'POST' as const,
  path: '/papers/decide/:publicId' as const,
  request: z
    .object({
      decision: z.enum(['endorse', 'revision_request', 'reject']),
      reason: z.string().trim().max(2000).optional(),
    })
    .superRefine((value, context) => {
      if (value.decision !== 'endorse' && !value.reason)
        context.addIssue({
          code: 'custom',
          path: ['reason'],
          message: 'A reason is required.',
        });
    }),
  response: paperSchema,
};
export const changePaperAdviserContract = {
  method: 'PATCH' as const,
  path: '/papers/change-adviser/:publicId' as const,
  request: z.object({ adviserId: z.string().uuid() }),
  response: paperSchema,
};

const publishedPaperSchema = z.object({
  withdrawn: z.literal(false),
  publicId: z.string(),
  title: z.string(),
  authors: paperDetailsSchema.shape.authors,
  abstract: z.string(),
  keywords: paperDetailsSchema.shape.keywords,
  program: z.string(),
  year: z.number().int(),
  researchType: paperDetailsSchema.shape.researchType,
  publishedAt: z.string().datetime(),
  institutionName: z.string(),
});
const withdrawnPaperSchema = z.object({
  withdrawn: z.literal(true),
  publicId: z.string(),
  title: z.string(),
  authors: paperDetailsSchema.shape.authors,
  year: z.number().int(),
  withdrawalNotice: z.string(),
});
export const publicPaperSchema = z.union([
  publishedPaperSchema,
  withdrawnPaperSchema,
]);
export type PublishedPaper = z.infer<typeof publishedPaperSchema>;
export type PublicPaper = z.infer<typeof publicPaperSchema>;
export const getPublicPaperContract = {
  method: 'GET' as const,
  path: '/papers/get/:publicId' as const,
  response: publicPaperSchema,
};
export const listPublishedPapersContract = {
  method: 'GET' as const,
  path: '/papers/catalog' as const,
  query: z.object({
    q: z.string().trim().max(200).optional(),
    program: z.string().uuid().optional(),
    year: z.coerce.number().int().min(1900).max(2200).optional(),
    researchType: paperDetailsSchema.shape.researchType.optional(),
    sort: z.enum(['relevance', 'date', 'title']).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  }),
  response: z.object({
    items: z.array(publishedPaperSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    programs: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
    years: z.array(z.number().int()),
  }),
};
export const listPublicationQueueContract = {
  method: 'GET' as const,
  path: '/papers/publication-queue' as const,
  response: z.array(paperSchema),
};
export const publishPaperContract = {
  method: 'POST' as const,
  path: '/papers/publish/:publicId' as const,
  response: paperSchema,
};
export const publishLegacyDepositContract = {
  method: 'POST' as const,
  path: '/papers/legacy-deposit/publish/:publicId' as const,
  response: paperSchema,
};
export const withdrawPaperContract = {
  method: 'POST' as const,
  path: '/papers/manage/:publicId/withdraw' as const,
  request: z.object({
    reason: z.string().trim().min(1).max(2000),
    publicNotice: z.string().trim().min(1).max(1000),
  }),
  response: paperSchema,
};
export const restorePaperContract = {
  method: 'POST' as const,
  path: '/papers/manage/:publicId/restore' as const,
  response: paperSchema,
};

export const paperFileStatusSchema = z.enum([
  'PENDING',
  'CLEAN',
  'REJECTED',
  'FAILED',
]);
export const paperFileReasonSchema = z.enum([
  'CORRUPT_PDF',
  'ENCRYPTED_PDF',
  'ACTIVE_CONTENT',
  'MALWARE',
]);
export const uploadPaperFileContract = {
  method: 'POST' as const,
  path: '/paper-files/upload/:publicId' as const,
  response: z.object({
    fileId: z.string().uuid(),
    status: z.literal('PENDING'),
  }),
};
export const getPaperFileStatusContract = {
  method: 'GET' as const,
  path: '/paper-files/status/:fileId' as const,
  response: z.object({
    id: z.string().uuid(),
    status: paperFileStatusSchema,
    reason: paperFileReasonSchema.nullable(),
  }),
};
export const getPaperContentContract = {
  method: 'GET' as const,
  path: '/paper-files/content/:publicId' as const,
};
export type PaperFileStatus = z.infer<typeof paperFileStatusSchema>;
