import {
  createProgramRequestSchema,
  publishDepositNoticeRequestSchema,
  updateSettingsRequestSchema,
} from '@repo/contracts';
import { requireCoordinator } from '../src/shared/domain/actor.js';
import type { Actor } from '../src/shared/domain/actor.js';

describe('Repository settings contracts and access', () => {
  it('rejects invalid policy values with field-authored messages', () => {
    const result = updateSettingsRequestSchema.safeParse({
      defaultAccessGrantDays: 31,
      maximumAccessGrantDays: 30,
      pendingRequestDays: 0,
      institutionName: 'Naga College Foundation',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        'Default Access Grant length cannot exceed the maximum.',
      );
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        'Pending request lifetime must be at least 1 day.',
      );
    }
  });

  it('validates required notice and program names', () => {
    expect(
      publishDepositNoticeRequestSchema.safeParse({ text: '  ' }).success,
    ).toBe(false);
    expect(createProgramRequestSchema.safeParse({ name: '  ' }).success).toBe(
      false,
    );
  });

  it('allows only active Coordinators through coordinator authorization', () => {
    const coordinator: Actor = {
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
    };
    expect(requireCoordinator(coordinator).id).toBe(coordinator.account.id);
    expect(() => requireCoordinator({ kind: 'guest' })).toThrow(
      'Only Coordinators can do this.',
    );
    expect(() =>
      requireCoordinator({
        ...coordinator,
        account: { ...coordinator.account, role: 'INSTRUCTOR' },
      }),
    ).toThrow('Only Coordinators can do this.');
  });
});
