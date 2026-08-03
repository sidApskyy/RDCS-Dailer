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
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WEBHOOK_URL: z.string().optional(),
  TWILIO_WEBHOOK_VERIFY: z.string().optional().default('true'),
}).superRefine((data, ctx) => {
  if (data.TELEPHONY_PROVIDER === 'twilio') {
    const missing: string[] = [];
    if (!data.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
    if (!data.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
    if (!data.TWILIO_PHONE_NUMBER) missing.push('TWILIO_PHONE_NUMBER');
    if (!data.TWILIO_WEBHOOK_URL) missing.push('TWILIO_WEBHOOK_URL');
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TELEPHONY_PROVIDER'],
        message: `TELEPHONY_PROVIDER=twilio requires the following environment variables: ${missing.join(', ')}.`,
      });
    }
    if (data.TWILIO_ACCOUNT_SID && !data.TWILIO_ACCOUNT_SID.startsWith('AC')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TWILIO_ACCOUNT_SID'],
        message: 'TWILIO_ACCOUNT_SID must start with "AC".',
      });
    }
    if (data.TWILIO_AUTH_TOKEN && data.TWILIO_AUTH_TOKEN.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TWILIO_AUTH_TOKEN'],
        message: 'TWILIO_AUTH_TOKEN must be at least 32 characters long.',
      });
    }
  }
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
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    TWILIO_WEBHOOK_URL: process.env.TWILIO_WEBHOOK_URL,
    TWILIO_WEBHOOK_VERIFY: process.env.TWILIO_WEBHOOK_VERIFY,
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
