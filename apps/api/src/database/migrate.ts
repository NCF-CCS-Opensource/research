import path from "node:path"
import { fileURLToPath } from "node:url"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations(connectionString?: string) {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/research"

  const client = postgres(url, { max: 1 })
  const db = drizzle(client)

  const migrationsFolder = path.resolve(__dirname, "../../drizzle")
  await migrate(db, { migrationsFolder })
  await client.end()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log("Migrations applied successfully.")
      process.exit(0)
    })
    .catch((err) => {
      console.error("Migration failed:", err)
      process.exit(1)
    })
}
