import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  listAuditEventsContract,
  type ListAuditEventsQuery,
} from '@repo/contracts';
import { CurrentActor } from '../../../common/current-actor.decorator.js';
import { ZodBody } from '../../../common/zod-body.pipe.js';
import type { Actor } from '../../../shared/domain/actor.js';
import { ListAuditEventsUseCase } from '../application/list-audit-events.use-case.js';

@Controller()
export class ListAuditEventsController {
  constructor(
    @Inject(ListAuditEventsUseCase)
    private readonly useCase: ListAuditEventsUseCase,
  ) {}

  @Get(listAuditEventsContract.path)
  handle(
    @Query(new ZodBody(listAuditEventsContract.query))
    query: ListAuditEventsQuery,
    @CurrentActor() actor: Actor,
  ) {
    return this.useCase.execute(query, actor);
  }
}
