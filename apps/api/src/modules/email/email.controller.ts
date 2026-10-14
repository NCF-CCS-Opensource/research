import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  listFailedEmailJobsContract,
  retryEmailJobContract,
} from '@repo/contracts';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import type { Actor } from '../../shared/domain/actor.js';
import { EmailUseCases } from './email.use-cases.js';

@Controller()
export class EmailController {
  constructor(private readonly emails: EmailUseCases) {}

  @Get(listFailedEmailJobsContract.path)
  listFailures(@CurrentActor() actor: Actor) {
    return this.emails.listFailures(actor);
  }

  @Post(retryEmailJobContract.path)
  retry(
    @CurrentActor() actor: Actor,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.emails.retry(actor, jobId);
  }
}
