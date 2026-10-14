import { Module } from '@nestjs/common';
import { AUDIT_READER } from './application/audit-reader.js';
import { ListAuditEventsUseCase } from './application/list-audit-events.use-case.js';
import { DrizzleAuditReader } from './infrastructure/drizzle-audit-reader.js';
import { ListAuditEventsController } from './presentation/list-audit-events.controller.js';

@Module({
  controllers: [ListAuditEventsController],
  providers: [
    ListAuditEventsUseCase,
    { provide: AUDIT_READER, useClass: DrizzleAuditReader },
  ],
})
export class AuditModule {}
