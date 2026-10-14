import {
  checkPaperAccessContract,
  revokeAccessGrantContract,
} from '@repo/contracts';

it('accepts revoked access status and requires a revocation reason', () => {
  expect(
    checkPaperAccessContract.response.safeParse({
      state: 'revoked',
      expiresAt: null,
      reason: 'Access ended',
      requestId: null,
    }).success,
  ).toBe(true);
  expect(
    revokeAccessGrantContract.request.safeParse({ reason: '  ' }).success,
  ).toBe(false);
});
