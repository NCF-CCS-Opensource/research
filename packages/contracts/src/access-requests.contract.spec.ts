import { describe, expect, it } from 'vitest';
import { requestPaperAccessContract } from './access-requests.contract.js';

describe('Access Request purpose', () => {
  it('accepts 30 through 1,500 trimmed characters', () => {
    expect(requestPaperAccessContract.request.safeParse({ purpose: 'x'.repeat(30) }).success).toBe(true);
    expect(requestPaperAccessContract.request.safeParse({ purpose: 'x'.repeat(1500) }).success).toBe(true);
  });
  it('rejects purposes outside the specified length', () => {
    expect(requestPaperAccessContract.request.safeParse({ purpose: 'x'.repeat(29) }).success).toBe(false);
    expect(requestPaperAccessContract.request.safeParse({ purpose: 'x'.repeat(1501) }).success).toBe(false);
  });
});
