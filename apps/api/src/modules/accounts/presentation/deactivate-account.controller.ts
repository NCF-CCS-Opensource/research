import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import {
  deactivateAccountContract,
  type AccountStatusChangeInput,
} from '@repo/contracts';
import { CurrentActor } from '../../../common/current-actor.decorator.js';
import { ZodBody } from '../../../common/zod-body.pipe.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { DeactivateAccountUseCase } from '../application/deactivate-account.use-case.js';

@Controller()
export class DeactivateAccountController {
  constructor(
    @Inject(DeactivateAccountUseCase)
    private readonly useCase: DeactivateAccountUseCase,
  ) {}

  @HttpCode(200)
  @Post(deactivateAccountContract.path)
  handle(
    @Body(new ZodBody(deactivateAccountContract.body))
    body: AccountStatusChangeInput,
    @CurrentActor() actor: Actor,
  ) {
    return this.useCase.execute(body, actor);
  }
}
