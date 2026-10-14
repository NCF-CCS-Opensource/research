import { Inject, Injectable } from '@nestjs/common';
import {
  requireCoordinator,
  type Actor,
} from '../../../shared/domain/actor.js';
import { toManaged } from '../domain/account.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from './account-repository.js';

@Injectable()
export class ListAccountsUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(_input: Record<string, never>, actor: Actor) {
    requireCoordinator(actor);
    return (await this.accounts.list()).map(toManaged);
  }
}
