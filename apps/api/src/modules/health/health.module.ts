import { Module } from '@nestjs/common';
import { DATABASE_PROBE } from './application/database-probe.js';
import { GetLivenessUseCase } from './application/get-liveness.use-case.js';
import { GetReadinessUseCase } from './application/get-readiness.use-case.js';
import { DrizzleDatabaseProbe } from './infrastructure/drizzle-database-probe.js';
import { GetLivenessController } from './presentation/get-liveness.controller.js';
import { GetReadinessController } from './presentation/get-readiness.controller.js';

@Module({
  controllers: [GetLivenessController, GetReadinessController],
  providers: [
    GetLivenessUseCase,
    GetReadinessUseCase,
    { provide: DATABASE_PROBE, useClass: DrizzleDatabaseProbe },
  ],
})
export class HealthModule {}
