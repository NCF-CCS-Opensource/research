import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import { SessionCookieAccess } from '../../common/public.decorator.js';
import type { Actor } from '../../shared/domain/actor.js';
import {
  getPaperContentContract,
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

  @Get(getPaperContentContract.path)
  @SessionCookieAccess()
  content(
    @CurrentActor() actor: Actor,
    @Param('publicId') publicId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.files.streamContent(actor, publicId, req, res);
  }
}
