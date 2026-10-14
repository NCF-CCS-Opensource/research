import { Controller, Get } from '@nestjs/common';
import { getDashboardContract } from '@repo/contracts';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import type { Actor } from '../../shared/domain/actor.js';
import { DashboardUseCases } from './dashboard.use-cases.js';

@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardUseCases) {}

  @Get(getDashboardContract.path)
  get(@CurrentActor() actor: Actor) {
    return this.dashboard.get(actor);
  }
}
