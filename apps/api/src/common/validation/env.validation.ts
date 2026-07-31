import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  WEB_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
  TELEPHONY_PROVIDER: z.enum(['mock', 'twilio']).default('mock'),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    const weakSecrets = ['test-secret-key', 'change-me', 'secret', 'jwt-secret'];
    if (weakSecrets.includes(data.JWT_SECRET)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: 'Weak JWT_SECRET is not allowed in production' });
    }
    if (weakSecrets.includes(data.JWT_REFRESH_SECRET)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_REFRESH_SECRET'], message: 'Weak JWT_REFRESH_SECRET is not allowed in production' });
    }
    if (!data.WEB_ORIGINS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['WEB_ORIGINS'], message: 'WEB_ORIGINS is required in production' });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    API_PORT: process.env.API_PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY,
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    WEB_ORIGINS: process.env.WEB_ORIGINS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    TELEPHONY_PROVIDER: process.env.TELEPHONY_PROVIDER,
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
