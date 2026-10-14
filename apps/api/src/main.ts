import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { validateEnv } from './config/env.js';

if (existsSync('.env')) process.loadEnvFile();

const env = validateEnv();
const app = await NestFactory.create(AppModule);
configureApp(app);
app.enableCors({ origin: env.WEB_ORIGIN });
await app.listen(env.PORT);
