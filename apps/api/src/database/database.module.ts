import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from "@nestjs/common"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { validateEnv } from "../config/env"
import * as schema from "./schema"

export const DATABASE_CONNECTION = Symbol("DATABASE_CONNECTION")
export const POSTGRES_CLIENT = Symbol("POSTGRES_CLIENT")

@Global()
@Module({
  providers: [
    {
      provide: POSTGRES_CLIENT,
      useFactory: () => {
        const env = validateEnv()
        return postgres(env.DATABASE_URL, { max: 10 })
      },
    },
    {
      provide: DATABASE_CONNECTION,
      inject: [POSTGRES_CLIENT],
      useFactory: (client: postgres.Sql) => {
        return drizzle(client, { schema })
      },
    },
  ],
  exports: [DATABASE_CONNECTION, POSTGRES_CLIENT],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(POSTGRES_CLIENT) private readonly client: postgres.Sql
  ) {}

  async onApplicationShutdown() {
    await this.client.end()
  }
}
