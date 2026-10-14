import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { registerAccountContract, type RegisterInput } from '@repo/contracts';
import { CurrentActor } from '../../../common/current-actor.decorator.js';
import { RegistrationOnly } from '../../../common/public.decorator.js';
import { ZodBody } from '../../../common/zod-body.pipe.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { RegisterAccountUseCase } from '../application/register-account.use-case.js';

@Controller()
export class RegisterAccountController {
  constructor(
    @Inject(RegisterAccountUseCase)
    private readonly useCase: RegisterAccountUseCase,
  ) {}

  @RegistrationOnly()
  @HttpCode(200)
  @Post(registerAccountContract.path)
  handle(
    @Body(new ZodBody(registerAccountContract.body)) body: RegisterInput,
    @CurrentActor() actor: Actor,
  ) {
    return this.useCase.execute(body, actor);
  }
}
