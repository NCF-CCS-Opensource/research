import type { Account } from './account.js';

export type Actor =
  | { kind: 'guest' }
  | { kind: 'registering'; clerkUserId: string; email: string }
  | { kind: 'active'; account: Account }
  | { kind: 'deactivated'; account: Account };

export const GUEST: Actor = { kind: 'guest' };
