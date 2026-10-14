import { Module } from '@nestjs/common';
import { AccessRequestController } from './access-request.controller.js';
import { AccessRequestUseCases } from './access-request.use-cases.js';

@Module({
  controllers: [AccessRequestController],
  providers: [AccessRequestUseCases],
})
export class AccessRequestModule {}
