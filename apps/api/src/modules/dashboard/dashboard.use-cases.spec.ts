import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../database/database.js';
import { DashboardUseCases } from './dashboard.use-cases.js';

describe('DashboardUseCases', () => {
  it('does not return account data to a guest or registering identity', async () => {
    const select = vi.fn();
    const db = { select } as unknown as Database;
    const dashboard = new DashboardUseCases(db);

    await expect(dashboard.get({ kind: 'guest' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      dashboard.get({
        kind: 'registering',
        clerkUserId: 'user_1',
        email: 'person@ncf.edu.ph',
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(select).not.toHaveBeenCalled();
  });
});
