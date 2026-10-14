import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Header,
} from '@nestjs/common';
import {
  createPaperContract,
  deletePaperContract,
  getPaperContract,
  listAdvisersContract,
  listMyPapersContract,
  updatePaperContract,
  submitPaperContract,
  listAdviserQueueContract,
  decidePaperContract,
  changePaperAdviserContract,
  getPublicPaperContract,
  listPublishedPapersContract,
  listPublicationQueueContract,
  publishPaperContract,
  createLegacyDepositContract,
  publishLegacyDepositContract,
  type CreatePaperRequest,
  type CreateLegacyDepositRequest,
  type Paper,
  type UpdatePaperRequest,
} from '@repo/contracts';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import { Public } from '../../common/public.decorator.js';
import type { Actor } from '../../shared/domain/actor.js';
import { ZodBody } from '../../common/zod-body.pipe.js';
import { PaperUseCases } from './paper.use-cases.js';

@Controller()
export class PaperController {
  constructor(private readonly papers: PaperUseCases) {}

  @Public()
  @Header('Cache-Control', 'no-store')
  @Get(getPublicPaperContract.path)
  getPublic(@Param('publicId') publicId: string) {
    return this.papers.getPublic(publicId);
  }

  @Public()
  @Header('Cache-Control', 'no-store')
  @Get(listPublishedPapersContract.path)
  listPublished() {
    return this.papers.listPublished();
  }

  @Get(listPublicationQueueContract.path)
  publicationQueue(@CurrentActor() actor: Actor) {
    return this.papers.listPublicationQueue(actor);
  }

  @Post(publishPaperContract.path)
  publish(@CurrentActor() actor: Actor, @Param('publicId') publicId: string) {
    return this.papers.publish(actor, publicId);
  }

  @Post(createLegacyDepositContract.path)
  createLegacyDeposit(
    @CurrentActor() actor: Actor,
    @Body(new ZodBody(createLegacyDepositContract.request))
    input: CreateLegacyDepositRequest,
  ) {
    return this.papers.createLegacyDeposit(actor, input);
  }

  @Post(publishLegacyDepositContract.path)
  publishLegacyDeposit(
    @CurrentActor() actor: Actor,
    @Param('publicId') publicId: string,
  ) {
    return this.papers.publishLegacyDeposit(actor, publicId);
  }

  @Get(listAdvisersContract.path)
  listAdvisers() {
    return this.papers.listAdvisers();
  }

  @Post(createPaperContract.path)
  create(
    @CurrentActor() identity: Actor,
    @Body(new ZodBody(createPaperContract.request))
    input: CreatePaperRequest,
  ): Promise<Paper> {
    return this.papers.create(identity, input);
  }

  @Get(listMyPapersContract.path)
  listMine(@CurrentActor() identity: Actor) {
    return this.papers.listMine(identity);
  }

  @Get(getPaperContract.path)
  get(
    @CurrentActor() identity: Actor,
    @Param('publicId') publicId: string,
  ): Promise<Paper> {
    return this.papers.get(identity, publicId);
  }

  @Patch(updatePaperContract.path)
  update(
    @CurrentActor() identity: Actor,
    @Param('publicId') publicId: string,
    @Body(new ZodBody(updatePaperContract.request))
    input: UpdatePaperRequest,
  ): Promise<Paper> {
    return this.papers.update(identity, publicId, input);
  }

  @Delete(deletePaperContract.path)
  delete(@CurrentActor() identity: Actor, @Param('publicId') publicId: string) {
    return this.papers.delete(identity, publicId);
  }

  @Post(submitPaperContract.path)
  submitPaper(
    @CurrentActor() actor: Actor,
    @Param('publicId') publicId: string,
    @Body(new ZodBody(submitPaperContract.request))
    body: { noticeVersion: number },
  ) {
    return this.papers.submit(actor, publicId, body.noticeVersion);
  }
  @Get(listAdviserQueueContract.path)
  adviserQueue(@CurrentActor() actor: Actor) {
    return this.papers.listAdviserQueue(actor);
  }
  @Post(decidePaperContract.path)
  decide(
    @CurrentActor() actor: Actor,
    @Param('publicId') publicId: string,
    @Body(new ZodBody(decidePaperContract.request))
    body: {
      decision: 'endorse' | 'revision_request' | 'reject';
      reason?: string;
    },
  ) {
    return this.papers.decide(actor, publicId, body.decision, body.reason);
  }
  @Patch(changePaperAdviserContract.path)
  changeAdviser(
    @CurrentActor() actor: Actor,
    @Param('publicId') publicId: string,
    @Body(new ZodBody(changePaperAdviserContract.request))
    body: { adviserId: string },
  ) {
    return this.papers.changeAdviser(actor, publicId, body.adviserId);
  }
}
