import { Inject, Injectable } from '@nestjs/common';
import { GUEST, type Actor } from '../../../shared/domain/actor.js';
import { normaliseEmail } from '../domain/account.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from './account-repository.js';
import { TOKEN_VERIFIER, type TokenVerifier } from './token-verifier.js';

/** Turns a bearer token into guest, registering, active, or deactivated. */
@Injectable()
export class IdentityResolver {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokens: TokenVerifier,
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async resolve(token: string | undefined): Promise<Actor> {
    if (!token) return GUEST;
    const identity = await this.tokens.verify(token);
    if (!identity) return GUEST;

    let account = await this.accounts.findByClerkUserId(identity.clerkUserId);
    if (!account) {
      return {
        kind: 'registering',
        clerkUserId: identity.clerkUserId,
        email: normaliseEmail(identity.email),
      };
    }
    const email = normaliseEmail(identity.email);
    if (account.email !== email) {
      account = await this.accounts.updateEmail(account.id, email);
    }
    return account.status === 'ACTIVE'
      ? { kind: 'active', account }
      : { kind: 'deactivated', account };
  }
}
