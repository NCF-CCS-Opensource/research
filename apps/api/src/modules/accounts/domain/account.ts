import { DomainError } from '../../../shared/domain/domain-error.js';
import type { Account, Role } from '../../../shared/domain/account.js';

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

export function toDetails(account: Account) {
  const { id, name, email, role, programId } = account;
  return { id, name, email, role, programId };
}
