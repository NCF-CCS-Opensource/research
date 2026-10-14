import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import {
  updateOwnProfileContract,
  type UpdateOwnProfileInput,
} from '@repo/contracts';
import { CurrentActor } from '../../../common/current-actor.decorator.js';
import { ZodBody } from '../../../common/zod-body.pipe.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { UpdateOwnProfileUseCase } from '../application/update-own-profile.use-case.js';

@Controller()
export class UpdateOwnProfileController {
  constructor(
    @Inject(UpdateOwnProfileUseCase)
    private readonly useCase: UpdateOwnProfileUseCase,
  ) {}

  @HttpCode(200)
  @Post(updateOwnProfileContract.path)
  handle(
    @Body(new ZodBody(updateOwnProfileContract.body))
    body: UpdateOwnProfileInput,
    @CurrentActor() actor: Actor,
  ) {
    return this.useCase.execute(body, actor);
  }
}
