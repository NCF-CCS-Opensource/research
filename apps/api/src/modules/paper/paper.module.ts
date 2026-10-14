import { Module } from '@nestjs/common';
import { PaperController } from './paper.controller.js';
import { PaperUseCases } from './paper.use-cases.js';

@Module({ controllers: [PaperController], providers: [PaperUseCases] })
export class PaperModule {}
