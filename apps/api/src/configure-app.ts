import type { INestApplication } from '@nestjs/common';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('v1/api');
}
