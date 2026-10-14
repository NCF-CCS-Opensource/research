import {
  DomainError,
  type DomainErrorKind,
} from '../../../shared/domain/domain-error.js';
import type { Account, Role } from '../../../shared/domain/account.js';
import type {
  ChangeOutcome,
  ManagedAccount,
} from '../application/account-repository.js';

const ROLE_BY_DOMAIN: Record<string, Role> = {
  'gbox.ncf.edu.ph': 'STUDENT',
  'ncf.edu.ph': 'INSTRUCTOR',
};

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Student for NCF student email, Instructor for NCF employee email. */
export function roleForEmail(email: string): Role {
  const domain = normaliseEmail(email).split('@').pop() ?? '';
  const role = ROLE_BY_DOMAIN[domain];
  if (!role) {
    throw new DomainError(
      'EMAIL_DOMAIN_NOT_ALLOWED',
      'Use your NCF email address (@gbox.ncf.edu.ph or @ncf.edu.ph) to register.',
      'forbidden',
    );
  }
  return role;
}

export function toManaged(account: ManagedAccount) {
  return {
    ...toDetails(account),
    status: account.status,
    programName: account.programName,
  };
}

const REFUSALS: Record<
  Exclude<ChangeOutcome['outcome'], 'changed'>,
  [code: string, message: string, kind: DomainErrorKind]
> = {
  not_found: ['ACCOUNT_NOT_FOUND', 'Account not found.', 'not_found'],
  unchanged: ['NO_CHANGE', 'The Account already has this setting.', 'conflict'],
  last_coordinator: [
    'LAST_COORDINATOR',
    'The repository must keep at least one active Coordinator.',
    'conflict',
  ],
};

/** The changed Account, or the authored refusal for any other outcome. */
export function unwrapChange(result: ChangeOutcome) {
  if (result.outcome === 'changed') return toManaged(result.account);
  const [code, message, kind] = REFUSALS[result.outcome];
  throw new DomainError(code, message, kind);
}

export function toDetails(account: Account) {
  const { id, name, email, role, programId } = account;
  return { id, name, email, role, programId };
}
