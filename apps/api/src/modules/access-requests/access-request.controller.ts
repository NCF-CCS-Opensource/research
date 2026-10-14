import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  cancelPaperAccessRequestContract,
  checkPaperAccessContract,
  decidePaperAccessRequestContract,
  listAccessRequestQueueContract,
  listMyAccessRequestsContract,
  listMyAccessGrantsContract,
  listAccessGrantQueueContract,
  revokeAccessGrantContract,
  requestPaperAccessContract,
} from '@repo/contracts';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import { AnyIdentity } from '../../common/public.decorator.js';
import { ZodBody } from '../../common/zod-body.pipe.js';
import type { Actor } from '../../shared/domain/actor.js';
import { AccessRequestUseCases } from './access-request.use-cases.js';

@Controller()
export class AccessRequestController {
  constructor(private readonly requests: AccessRequestUseCases) {}
  @Post(requestPaperAccessContract.path)
  request(
    @CurrentActor() actor: Actor,
    @Param('publicId') publicId: string,
    @Body(new ZodBody(requestPaperAccessContract.request))
    body: { purpose: string },
  ) {
    return this.requests.request(actor, publicId, body.purpose);
  }
  @Post(cancelPaperAccessRequestContract.path)
  cancel(@CurrentActor() actor: Actor, @Param('requestId') id: string) {
    return this.requests.cancel(actor, id);
  }
  @Get(listMyAccessRequestsContract.path)
  mine(@CurrentActor() actor: Actor) {
    return this.requests.mine(actor);
  }
  @Get(listMyAccessGrantsContract.path)
  myGrants(@CurrentActor() actor: Actor) {
    return this.requests.grants(actor);
  }
  @Get(listAccessGrantQueueContract.path)
  grantQueue(@CurrentActor() actor: Actor) {
    return this.requests.grants(actor, true);
  }
  @Post(revokeAccessGrantContract.path)
  revoke(
    @CurrentActor() actor: Actor,
    @Param('grantId') id: string,
    @Body(new ZodBody(revokeAccessGrantContract.request))
    body: { reason: string },
  ) {
    return this.requests.revoke(actor, id, body.reason);
  }
  @Get(listAccessRequestQueueContract.path)
  queue(@CurrentActor() actor: Actor) {
    return this.requests.queue(actor);
  }
  @Post(decidePaperAccessRequestContract.path)
  decide(
    @CurrentActor() actor: Actor,
    @Param('requestId') id: string,
    @Body(new ZodBody(decidePaperAccessRequestContract.request))
    body: { decision: 'approve' | 'deny'; days?: number; reason?: string },
  ) {
    return this.requests.decide(actor, id, body.decision, body);
  }
  @Get(checkPaperAccessContract.path)
  @AnyIdentity()
  check(@CurrentActor() actor: Actor, @Param('publicId') publicId: string) {
    return this.requests.check(actor, publicId);
  }
}
