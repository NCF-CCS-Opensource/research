import { Inject, Injectable } from '@nestjs/common';
import type { RegisterInput } from '@repo/contracts';
import type { Actor } from '../../../shared/domain/actor.js';
import { DomainError } from '../../../shared/domain/domain-error.js';
import { roleForEmail, toDetails } from '../domain/account.js';
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from './account-repository.js';

@Injectable()
export class RegisterAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
  ) {}

  async execute(input: RegisterInput, actor: Actor) {
    if (actor.kind !== 'registering') {
      throw new DomainError(
        'ALREADY_REGISTERED',
        'You are already registered.',
        'conflict',
      );
    }
    const role = roleForEmail(actor.email);
    const programId = input.programId ?? null;
    if (programId && !(await this.accounts.isActiveProgram(programId))) {
      throw new DomainError(
        'PROGRAM_NOT_FOUND',
        'Choose a Program from the list.',
        'invalid',
      );
    }
    const account = await this.accounts.register({
      clerkUserId: actor.clerkUserId,
      name: input.name,
      email: actor.email,
      role,
      programId,
    });
    if (!account) {
      throw new DomainError(
        'ALREADY_REGISTERED',
        'This identity or email is already registered.',
        'conflict',
      );
    }
    return toDetails(account);
  }
}
