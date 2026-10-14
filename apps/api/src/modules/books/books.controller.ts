import {
  Controller,
  Get,
  Header,
  Param,
  Post,
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
} from '@repo/contracts';
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
