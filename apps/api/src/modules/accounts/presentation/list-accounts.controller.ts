import { Controller, Get, Inject } from '@nestjs/common';
import { listAccountsContract } from '@repo/contracts';
import { CurrentActor } from '../../../common/current-actor.decorator.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { ListAccountsUseCase } from '../application/list-accounts.use-case.js';

@Controller()
export class ListAccountsController {
  constructor(
    @Inject(ListAccountsUseCase) private readonly useCase: ListAccountsUseCase,
  ) {}

  @Get(listAccountsContract.path)
  handle(@CurrentActor() actor: Actor) {
    return this.useCase.execute({}, actor);
  }
}
