import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import {
  reactivateAccountContract,
  type AccountStatusChangeInput,
} from '@repo/contracts';
import { CurrentActor } from '../../../common/current-actor.decorator.js';
import { ZodBody } from '../../../common/zod-body.pipe.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { ReactivateAccountUseCase } from '../application/reactivate-account.use-case.js';

@Controller()
export class ReactivateAccountController {
  constructor(
    @Inject(ReactivateAccountUseCase)
    private readonly useCase: ReactivateAccountUseCase,
  ) {}

  @HttpCode(200)
  @Post(reactivateAccountContract.path)
  handle(
    @Body(new ZodBody(reactivateAccountContract.body))
    body: AccountStatusChangeInput,
    @CurrentActor() actor: Actor,
  ) {
    return this.useCase.execute(body, actor);
  }
}
