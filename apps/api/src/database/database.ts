import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

export function createDatabaseClient(connectionString: string) {
  const client = postgres(connectionString, { max: 10 })
  const db = drizzle(client, { schema })
  return { client, db }
}

export type Database = ReturnType<typeof createDatabaseClient>["db"]
