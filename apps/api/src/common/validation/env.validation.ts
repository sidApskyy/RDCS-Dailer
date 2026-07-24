import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  WEB_ORIGIN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    API_PORT: process.env.API_PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    WEB_ORIGIN: process.env.WEB_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((e) => e.code === 'invalid_type')
        .map((e) => e.path.join('.'));
      const invalidVars = error.errors
        .filter((e) => e.code !== 'invalid_type')
        .map((e) => `${e.path.join('.')}: ${e.message}`);

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
