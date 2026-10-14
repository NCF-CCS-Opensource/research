import { describe, expect, it } from 'vitest';
import { paperDetailsSchema, publicPaperSchema } from './draft.contract.js';

const valid = {
  title: 'A valid research title',
  abstract: 'a'.repeat(100),
  authors: [{ displayName: 'Ada Lovelace', kind: 'person' as const }],
  year: new Date().getFullYear(),
  researchType: 'THESIS' as const,
  keywords: ['research', 'systems', 'design'],
  programId: '10000000-0000-4000-8000-000000000001',
};

describe('paperDetailsSchema', () => {
  it('accepts valid details and trims the title', () => {
    expect(
      paperDetailsSchema.parse({ ...valid, title: ` ${valid.title} ` }).title,
    ).toBe(valid.title);
  });

  it('rejects duplicate keywords regardless of case', () => {
    expect(
      paperDetailsSchema.safeParse({
        ...valid,
        keywords: ['Research', 'research', 'systems'],
      }).success,
    ).toBe(false);
  });

  it('rejects an abstract shorter than 100 characters', () => {
    expect(
      paperDetailsSchema.safeParse({ ...valid, abstract: 'too short' }).success,
    ).toBe(false);
  });
});

describe('publicPaperSchema', () => {
  it('exposes only citation fields for withdrawn Papers', () => {
    const parsed = publicPaperSchema.parse({
      withdrawn: true,
      publicId: 'paper-1',
      title: 'A withdrawn Paper',
      authors: [{ displayName: 'Ada Lovelace', kind: 'person' }],
      year: 2025,
      withdrawalNotice: 'This Paper has been withdrawn.',
      abstract: 'must not be exposed',
      reason: 'must not be exposed',
    });
    expect(parsed).toEqual({
      withdrawn: true,
      publicId: 'paper-1',
      title: 'A withdrawn Paper',
      authors: [{ displayName: 'Ada Lovelace', kind: 'person' }],
      year: 2025,
      withdrawalNotice: 'This Paper has been withdrawn.',
    });
  });
});
