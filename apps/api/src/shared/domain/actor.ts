import type { Account } from './account.js';
import { DomainError } from './domain-error.js';

export type Actor =
  | { kind: 'guest' }
  | { kind: 'registering'; clerkUserId: string; email: string }
  | { kind: 'active'; account: Account }
  | { kind: 'deactivated'; account: Account };

export const GUEST: Actor = { kind: 'guest' };

/** The acting Coordinator's Account; refuses everyone else with 403. */
export function requireCoordinator(actor: Actor): Account {
  if (actor.kind === 'active' && actor.account.role === 'COORDINATOR') {
    return actor.account;
  }
  throw new DomainError(
    'FORBIDDEN',
    'Only Coordinators can do this.',
    'forbidden',
  );
}
