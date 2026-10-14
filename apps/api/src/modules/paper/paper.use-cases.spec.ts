import { describe, expect, it } from 'vitest';
import type { Database } from '../../database/database.js';
import {
  PaperUseCases,
  StalePaperEditError,
  paperReferencesMatch,
} from './paper.use-cases.js';

describe('PaperUseCases', () => {
  const useCases = new PaperUseCases(undefined as unknown as Database);

  it("hides another account's Paper list from non-Students", async () => {
    await expect(
      useCases.listMine({
        kind: 'active',
        account: {
          id: '10000000-0000-0000-0000-000000000001',
          clerkUserId: 'user_1',
          name: 'Coordinator',
          email: 'coordinator@ncf.edu.ph',
          role: 'COORDINATOR',
          status: 'ACTIVE',
          programId: null,
        },
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('reports stale lock-version edits as conflicts', () => {
    expect(new StalePaperEditError().kind).toBe('conflict');
  });

  it('requires the current version and its file to belong to the same Paper', () => {
    const version = {
      id: 'version-1',
      paperId: 'paper-1',
      pdfFileId: 'file-1',
    };
    expect(
      paperReferencesMatch('paper-1', version, {
        id: 'file-1',
        paperId: 'paper-1',
        versionId: 'version-1',
      }),
    ).toBe(true);
    expect(
      paperReferencesMatch('paper-2', version, {
        id: 'file-1',
        paperId: 'paper-1',
        versionId: 'version-1',
      }),
    ).toBe(false);
    expect(
      paperReferencesMatch('paper-1', version, {
        id: 'file-1',
        paperId: 'paper-1',
        versionId: 'version-2',
      }),
    ).toBe(false);
  });
});
