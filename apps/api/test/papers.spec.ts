import { paperDetailsSchema } from '@repo/contracts';
import { PaperUseCases } from '../src/modules/paper/paper.use-cases.js';
import type { Database } from '../src/database/database.js';

describe('Paper draft contracts', () => {
  const useCases = new PaperUseCases(undefined as unknown as Database);

  it('rejects invalid paper details before persistence', () => {
    const result = paperDetailsSchema.safeParse({
      title: 'short',
      abstract: 'plain text',
      authors: [],
      year: 1899,
      researchType: 'UNKNOWN',
      keywords: ['a', 'a'],
      programId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('hides draft workflows from non-Student accounts', async () => {
    await expect(
      useCases.listMine({
        kind: 'active',
        account: {
          id: '00000000-0000-0000-0000-000000000001',
          clerkUserId: 'coord',
          name: 'Coordinator',
          email: 'coord@ncf.edu.ph',
          role: 'COORDINATOR',
          status: 'ACTIVE',
          programId: null,
        },
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
