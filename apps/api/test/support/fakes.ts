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

  async verify(token: string) {
    return this.identities.get(token) ?? null;
  }
}

export class InMemoryAccountRepository implements AccountRepository {
  readonly accounts: Account[] = [];
  readonly audit: { action: string; subjectId: string }[] = [];
  readonly activePrograms = new Set<string>();

  async findByClerkUserId(clerkUserId: string) {
    return this.accounts.find((a) => a.clerkUserId === clerkUserId) ?? null;
  }

  async isActiveProgram(programId: string) {
    return this.activePrograms.has(programId);
  }

  async register(input: NewAccount) {
    const taken = this.accounts.some(
      (a) =>
        a.clerkUserId === input.clerkUserId ||
        a.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (taken) return null;
    const account: Account = { id: randomUUID(), status: 'ACTIVE', ...input };
    this.accounts.push(account);
    this.audit.push({ action: 'ACCOUNT_REGISTERED', subjectId: account.id });
    return account;
  }

  async updateEmail(id: string, email: string) {
    return this.patch(id, { email });
  }

  async updateProfile(
    id: string,
    profile: { name: string; programId: string | null },
  ) {
    return this.patch(id, profile);
  }

  private patch(id: string, change: Partial<Account>) {
    const account = this.accounts.find((a) => a.id === id)!;
    Object.assign(account, change);
    return account;
  }
}
