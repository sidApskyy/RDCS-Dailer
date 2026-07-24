import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SOCKET_PORT: z.string().regex(/^\d+$/).transform(Number).default('3002'),
  REDIS_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    SOCKET_PORT: process.env.SOCKET_PORT,
    REDIS_URL: process.env.REDIS_URL,
    WEB_ORIGIN: process.env.WEB_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((e: z.ZodIssue) => e.code === 'invalid_type')
        .map((e: z.ZodIssue) => e.path.join('.'));
      const invalidVars = error.errors
        .filter((e: z.ZodIssue) => e.code !== 'invalid_type')
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);

      console.error('Environment validation failed:');
      if (missingVars.length > 0) {
        console.error('Missing environment variables:', missingVars.join(', '));
      }
      if (invalidVars.length > 0) {
        console.error('Invalid environment variables:', invalidVars.join(', '));
      }
      process.exit(1);
    }
    throw error;
  }
}
