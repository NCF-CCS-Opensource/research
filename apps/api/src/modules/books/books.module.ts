import { Module } from '@nestjs/common';
import { BooksController } from './books.controller.js';
import { BooksUseCases } from './books.use-cases.js';
import { PaperFileModule } from '../paper-files/paper-file.module.js';

@Module({
  imports: [PaperFileModule],
  controllers: [BooksController],
  providers: [BooksUseCases],
})
export class BooksModule {}
