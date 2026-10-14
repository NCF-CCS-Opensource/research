import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3001),
    WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    CLERK_SECRET_KEY: z.string().min(1).optional(),
    CLERK_JWT_KEY: z.string().min(1).optional(),
    R2_ENDPOINT: z.string().url().optional(),
    R2_BUCKET: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV === 'production' && !env.RESEND_API_KEY)
      context.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Required in production.',
      });
    if (env.NODE_ENV === 'production' && !env.EMAIL_FROM)
      context.addIssue({
        code: 'custom',
        path: ['EMAIL_FROM'],
        message: 'Required in production.',
      });
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(
  source: Record<string, unknown> = process.env,
): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  return result.data;
}
