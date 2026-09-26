import { z } from "zod"

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z
    .string({ required_error: "DATABASE_URL is required" })
    .min(1, { message: "DATABASE_URL is required" }),
  WEB_ORIGIN: z.string().optional().default("http://localhost:3000"),
  CLERK_SECRET_KEY: z
    .string({ required_error: "CLERK_SECRET_KEY is required" })
    .min(1, { message: "CLERK_SECRET_KEY is required" }),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(env: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ")
    throw new Error(`Invalid environment configuration: ${formatted}`)
  }
  return result.data
}
