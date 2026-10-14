import { Inject, Injectable } from '@nestjs/common';
import type { UpdateOwnProfileInput } from '@repo/contracts';
import type { Actor } from '../../../shared/domain/actor.js';
import { DomainError } from '../../../shared/domain/domain-error.js';
import { toDetails } from '../domain/account.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from './account-repository.js';

@Injectable()
export class UpdateOwnProfileUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(input: UpdateOwnProfileInput, actor: Actor) {
    if (actor.kind !== 'active') {
      throw new DomainError(
        'UNAUTHENTICATED',
        'Sign in to continue.',
        'unauthenticated',
      );
    }
    if (
      input.programId &&
      !(await this.accounts.isActiveProgram(input.programId))
    ) {
      throw new DomainError(
        'PROGRAM_NOT_FOUND',
        'Choose a Program from the list.',
        'invalid',
      );
    }
    return toDetails(
      await this.accounts.updateProfile(actor.account.id, {
        name: input.name,
        programId: input.programId,
      }),
    );
  }
}
