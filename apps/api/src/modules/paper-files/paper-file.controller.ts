import { Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import type { Actor } from '../../shared/domain/actor.js';
import {
  getPaperFileStatusContract,
  uploadPaperFileContract,
} from '@repo/contracts';
import { PaperFileUseCases } from './paper-file.use-cases.js';

@Controller()
export class PaperFileController {
  constructor(private readonly files: PaperFileUseCases) {}
  @Post(uploadPaperFileContract.path)
  @HttpCode(202)
  upload(
    @CurrentActor() actor: Actor,
    @Param('publicId') publicId: string,
    @Req() req: Request,
  ) {
    return this.files.upload(actor, publicId, req);
  }
  @Get(getPaperFileStatusContract.path)
  status(@CurrentActor() actor: Actor, @Param('fileId') fileId: string) {
    return this.files.status(actor, fileId);
  }
}
