import { Inject, Injectable } from '@nestjs/common';
import type { ChangeAccountRoleInput } from '@repo/contracts';
import {
  requireCoordinator,
  type Actor,
} from '../../../shared/domain/actor.js';
import { unwrapChange } from '../domain/account.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from './account-repository.js';

@Injectable()
export class ChangeAccountRoleUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(input: ChangeAccountRoleInput, actor: Actor) {
    const coordinator = requireCoordinator(actor);
    return unwrapChange(
      await this.accounts.changeRole({ actorId: coordinator.id, ...input }),
    );
  }
}
