import { z } from 'zod';
import { successEnvelope } from './envelope.js';

export const RESEARCH_TYPES = [
  { value: 'THESIS', label: 'Thesis' },
  { value: 'CAPSTONE', label: 'Capstone' },
  { value: 'RESEARCH_PAPER', label: 'Research paper' },
  { value: 'PROJECT_REPORT', label: 'Project report' },
] as const;

// Open licences and public domain only (ADR 0003).
export const LICENCES = [
  'CC0',
  'CC BY',
  'CC BY-SA',
  'CC BY-NC',
  'CC BY-NC-SA',
  'CC BY-ND',
  'CC BY-NC-ND',
  'Public domain',
] as const;

export const referenceDataSchema = z.object({
  programs: z.array(z.object({ id: z.uuid(), name: z.string().min(1) })),
  researchTypes: z.array(z.object({ value: z.string(), label: z.string() })),
  licences: z.array(z.string()),
});
export type ReferenceData = z.infer<typeof referenceDataSchema>;

export const referenceDataContract = {
  method: 'GET' as const,
  path: '/reference-data/get' as const,
  response: successEnvelope(referenceDataSchema),
};
export type ReferenceDataResponse = z.infer<
  typeof referenceDataContract.response
>;
