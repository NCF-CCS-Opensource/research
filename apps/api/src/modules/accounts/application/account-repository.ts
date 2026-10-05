import type { Account, Role } from '../../../shared/domain/account.js';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface NewAccount {
  clerkUserId: string;
  name: string;
  email: string;
  role: Role;
  programId: string | null;
}

export interface AccountRepository {
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
