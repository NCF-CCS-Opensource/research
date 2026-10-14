import {
  Controller,
  Body,
  Get,
  Header,
  Param,
  Post,
  Patch,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentActor } from '../../common/current-actor.decorator.js';
import { Public } from '../../common/public.decorator.js';
import type { Actor } from '../../shared/domain/actor.js';
import {
  getBookContentContract,
  getBookDownloadContract,
  getPublicBookContract,
  listBooksContract,
  createBookContract,
  updateBookContract,
  getManagedBookContract,
  listMyBooksContract,
  listBookQueueContract,
  decideBookContract,
  withdrawBookContract,
  restoreBookContract,
  type BookDetails,
} from '@repo/contracts';
import { ZodBody } from '../../common/zod-body.pipe.js';
import { BooksUseCases } from './books.use-cases.js';

@Controller()
export class BooksController {
  constructor(private readonly books: BooksUseCases) {}
  @Public()
  @Header('Cache-Control', 'no-store')
  @Get(listBooksContract.path)
  list(@Query('q') query = '') {
    return this.books.list(query);
  }
  @Public()
  @Header('Cache-Control', 'no-store')
  @Get(getPublicBookContract.path)
  get(@Param('publicId') id: string) {
    return this.books.get(id);
  }
  @Post(createBookContract.path)
  create(@CurrentActor() actor: Actor, @Req() req: Request) {
    return this.books.create(actor, req);
  }
  @Get(listMyBooksContract.path)
  listMine(@CurrentActor() actor: Actor) {
    return this.books.listMine(actor);
  }
  @Get(getManagedBookContract.path)
  getManaged(@CurrentActor() actor: Actor, @Param('publicId') id: string) {
    return this.books.getManaged(actor, id);
  }
  @Get(listBookQueueContract.path)
  queue(@CurrentActor() actor: Actor) {
    return this.books.listQueue(actor);
  }
  @Patch(updateBookContract.path)
  update(
    @CurrentActor() actor: Actor,
    @Param('publicId') id: string,
    @Body(new ZodBody(updateBookContract.request)) input: BookDetails,
  ) {
    return this.books.update(actor, id, input);
  }
  @Post(decideBookContract.path)
  decide(
    @CurrentActor() actor: Actor,
    @Param('publicId') id: string,
    @Body(new ZodBody(decideBookContract.request))
    input: { decision: 'publish' | 'reject'; reason?: string },
  ) {
    return this.books.decide(actor, id, input.decision, input.reason);
  }
  @Post(withdrawBookContract.path)
  withdraw(@CurrentActor() actor: Actor, @Param('publicId') id: string) {
    return this.books.withdraw(actor, id);
  }
  @Post(restoreBookContract.path)
  restore(@CurrentActor() actor: Actor, @Param('publicId') id: string) {
    return this.books.restore(actor, id);
  }
  @Public()
  @Header('Cache-Control', 'no-store')
  @Get(getBookContentContract.path)
  content(
    @Param('publicId') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.books.content(id, req.ip ?? 'unknown', false, req, res);
  }
  @Public()
  @Header('Cache-Control', 'no-store')
  @Get(getBookDownloadContract.path)
  download(
    @Param('publicId') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.books.content(id, req.ip ?? 'unknown', true, req, res);
  }
}
