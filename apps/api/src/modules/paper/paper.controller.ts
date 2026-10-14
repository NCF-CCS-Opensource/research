import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  createPaperContract,
  deletePaperContract,
  getPaperContract,
  listAdvisersContract,
  listMyPapersContract,
  updatePaperContract,
  type CreatePaperRequest,
  type Paper,
  type UpdatePaperRequest,
} from '@repo/contracts';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import type { Actor } from '../../shared/domain/actor.js';
import { ZodBody } from '../../common/zod-body.pipe.js';
import { PaperUseCases } from './paper.use-cases.js';

@Controller()
export class PaperController {
  constructor(private readonly papers: PaperUseCases) {}

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
}
