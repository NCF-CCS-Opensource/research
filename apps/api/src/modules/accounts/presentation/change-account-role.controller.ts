import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import {
  changeAccountRoleContract,
  type ChangeAccountRoleInput,
} from '@repo/contracts';
import { CurrentActor } from '../../../common/current-actor.decorator.js';
import { ZodBody } from '../../../common/zod-body.pipe.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { ChangeAccountRoleUseCase } from '../application/change-account-role.use-case.js';

@Controller()
export class ChangeAccountRoleController {
  constructor(
    @Inject(ChangeAccountRoleUseCase)
    private readonly useCase: ChangeAccountRoleUseCase,
  ) {}

  @HttpCode(200)
  @Post(changeAccountRoleContract.path)
  handle(
    @Body(new ZodBody(changeAccountRoleContract.body))
    body: ChangeAccountRoleInput,
    @CurrentActor() actor: Actor,
  ) {
    return this.useCase.execute(body, actor);
  }
}
