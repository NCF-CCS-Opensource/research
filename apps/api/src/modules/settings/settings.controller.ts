import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createProgramContract,
  getCurrentDepositNoticeContract,
  getSettingsContract,
  listDepositNoticesContract,
  publishDepositNoticeContract,
  updateProgramContract,
  updateSettingsContract,
} from '@repo/contracts';
import type { UpdateSettingsRequest } from '@repo/contracts';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import { requireCoordinator, type Actor } from '../../shared/domain/actor.js';
import { DomainError } from '../../shared/domain/domain-error.js';
import { ZodBody } from '../../common/zod-body.pipe.js';
import { SettingsService } from './settings.service.js';

@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get(getSettingsContract.path)
  getSettings(@CurrentActor() actor: Actor) {
    requireCoordinator(actor);
    return this.service.getSettings();
  }

  @Patch(updateSettingsContract.path)
  updateSettings(
    @CurrentActor() actor: Actor,
    @Body(new ZodBody(updateSettingsContract.request))
    body: UpdateSettingsRequest,
  ) {
    const account = requireCoordinator(actor);
    return this.service.updateSettings(account.id, body);
  }

  @Get(getCurrentDepositNoticeContract.path)
  currentNotice(@CurrentActor() actor: Actor) {
    if (actor.kind !== 'active')
      throw new DomainError(
        'UNAUTHENTICATED',
        'Sign in to continue.',
        'unauthenticated',
      );
    return this.service.currentDepositNotice();
  }

  @Get(listDepositNoticesContract.path)
  listNotices(@CurrentActor() actor: Actor) {
    requireCoordinator(actor);
    return this.service.listDepositNotices();
  }

  @Post(publishDepositNoticeContract.path)
  publishNotice(
    @CurrentActor() actor: Actor,
    @Body(new ZodBody(publishDepositNoticeContract.request))
    body: { text: string },
  ) {
    const account = requireCoordinator(actor);
    return this.service.publishDepositNotice(account.id, body.text);
  }

  @Post(createProgramContract.path)
  createProgram(
    @CurrentActor() actor: Actor,
    @Body(new ZodBody(createProgramContract.request))
    body: { name: string },
  ) {
    const account = requireCoordinator(actor);
    return this.service.createProgram(account.id, body.name);
  }

  @Patch(updateProgramContract.path)
  updateProgram(
    @CurrentActor() actor: Actor,
    @Param('programId') id: string,
    @Body(new ZodBody(updateProgramContract.request))
    body: { name: string; active: boolean },
  ) {
    const account = requireCoordinator(actor);
    return this.service.updateProgram(account.id, id, body.name, body.active);
  }
}
