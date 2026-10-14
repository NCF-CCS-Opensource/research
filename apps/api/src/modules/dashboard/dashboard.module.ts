import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardUseCases } from './dashboard.use-cases.js';

@Module({ controllers: [DashboardController], providers: [DashboardUseCases] })
export class DashboardModule {}
