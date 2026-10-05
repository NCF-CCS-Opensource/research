import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DefaultDenyGuard } from './common/default-deny.guard.js';
import { EnvelopeInterceptor } from './common/envelope.interceptor.js';
import { ErrorEnvelopeFilter } from './common/error-envelope.filter.js';
import { requestId } from './common/request-id.middleware.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ReferenceDataModule } from './modules/reference-data/reference-data.module.js';

@Module({
  imports: [DatabaseModule, ReferenceDataModule, HealthModule],
  providers: [
    { provide: APP_GUARD, useClass: DefaultDenyGuard },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestId).forRoutes('*path');
  }
}
