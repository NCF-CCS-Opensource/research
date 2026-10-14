import type {
  Account,
  AccountStatus,
  Role,
} from '../../../shared/domain/account.js';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface NewAccount {
  clerkUserId: string;
  name: string;
  email: string;
  role: Role;
  programId: string | null;
}

export type ManagedAccount = Account & { programName: string | null };

export type ChangeOutcome =
  | { outcome: 'changed'; account: ManagedAccount }
  | { outcome: 'not_found' | 'unchanged' | 'last_coordinator' };

export interface AccountRepository {
  list(): Promise<ManagedAccount[]>;
  /**
   * Changes a role and audits it with the reason. Refuses to remove the last
   * active Coordinator, even under concurrent calls.
   */
  changeRole(change: {
    actorId: string;
    accountId: string;
    role: Role;
    reason: string;
  }): Promise<ChangeOutcome>;
  /** Same last-Coordinator guarantee as changeRole. */
  setStatus(change: {
    actorId: string;
    accountId: string;
    status: AccountStatus;
    reason: string;
  }): Promise<ChangeOutcome>;
  findByClerkUserId(clerkUserId: string): Promise<Account | null>;
  isActiveProgram(programId: string): Promise<boolean>;
  /** Saves the Account and its Registration audit event together. Null when the identity or email is already registered. */
  register(account: NewAccount): Promise<Account | null>;
  /** Null when another Account already holds the email. */
  updateEmail(id: string, email: string): Promise<Account | null>;
  updateProfile(
    id: string,
    profile: { name: string; programId: string | null },
  ): Promise<Account>;
}
