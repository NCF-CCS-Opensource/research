import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { validateEnv } from "./config/env"

try {
  const env = validateEnv()

  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  })

  await app.listen(env.PORT)
  console.log(`API is running on port ${env.PORT}`)
} catch (err) {
  console.error("Failed to start API application:", err)
  process.exit(1)
}
