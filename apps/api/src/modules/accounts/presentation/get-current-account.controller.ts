import { Controller, Get, Inject } from '@nestjs/common';
import { getCurrentAccountContract } from '@repo/contracts';
import { AnyIdentity } from '../../../common/public.decorator.js';
import { CurrentActor } from '../../../common/current-actor.decorator.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { GetCurrentAccountUseCase } from '../application/get-current-account.use-case.js';

@Controller()
export class GetCurrentAccountController {
  constructor(
    @Inject(GetCurrentAccountUseCase)
    private readonly useCase: GetCurrentAccountUseCase,
  ) {}

  @AnyIdentity()
  @Get(getCurrentAccountContract.path)
  handle(@CurrentActor() actor: Actor) {
    return this.useCase.execute({}, actor);
  }
}
