import { randomUUID } from 'node:crypto';
import type {
  AccountRepository,
  NewAccount,
} from '../../src/modules/accounts/application/account-repository.js';
import type {
  TokenVerifier,
  VerifiedIdentity,
} from '../../src/modules/accounts/application/token-verifier.js';
import type { Account } from '../../src/shared/domain/account.js';

/** Maps test tokens to identities, replacing Clerk verification. */
export class FakeTokenVerifier implements TokenVerifier {
  readonly identities = new Map<string, VerifiedIdentity>();

  verify(token: string) {
    return Promise.resolve(this.identities.get(token) ?? null);
  }
}

export class InMemoryAccountRepository implements AccountRepository {
  readonly accounts: Account[] = [];
  readonly audit: { action: string; subjectId: string }[] = [];
  readonly activePrograms = new Set<string>();

  findByClerkUserId(clerkUserId: string) {
    return Promise.resolve(
      this.accounts.find((a) => a.clerkUserId === clerkUserId) ?? null,
    );
  }

  isActiveProgram(programId: string) {
    return Promise.resolve(this.activePrograms.has(programId));
  }

  register(input: NewAccount) {
    const taken = this.accounts.some(
      (a) =>
        a.clerkUserId === input.clerkUserId ||
        a.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (taken) return Promise.resolve(null);
    const account: Account = { id: randomUUID(), status: 'ACTIVE', ...input };
    this.accounts.push(account);
    this.audit.push({ action: 'ACCOUNT_REGISTERED', subjectId: account.id });
    return Promise.resolve(account);
  }

  updateEmail(id: string, email: string) {
    if (this.accounts.some((a) => a.id !== id && a.email === email))
      return Promise.resolve(null);
    return Promise.resolve(this.patch(id, { email }));
  }

  updateProfile(
    id: string,
    profile: { name: string; programId: string | null },
  ) {
    return Promise.resolve(this.patch(id, profile));
  }

  private patch(id: string, change: Partial<Account>) {
    const account = this.accounts.find((a) => a.id === id)!;
    Object.assign(account, change);
    return account;
  }
}
