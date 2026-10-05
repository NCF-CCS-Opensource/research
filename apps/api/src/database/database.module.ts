import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { validateEnv } from '../config/env.js';
import * as schema from './schema/index.js';

export const POSTGRES = Symbol('POSTGRES');
export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  providers: [
    {
      provide: POSTGRES,
      useFactory: () => postgres(validateEnv().DATABASE_URL, { max: 10 }),
    },
    {
      provide: DATABASE,
      inject: [POSTGRES],
      useFactory: (client: postgres.Sql) => drizzle(client, { schema }),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES) private readonly client: postgres.Sql) {}

  async onApplicationShutdown() {
    await this.client.end();
  }
}
