import { defineConfig, devices } from '@playwright/test';

// Ensure critical env defaults are present for both the test runner and web servers
const DEFAULT_DB_URL = 'postgresql://postgres:postgres@localhost:5432/rdcs_test';
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = DEFAULT_DB_URL;
if (!process.env.NEXT_PUBLIC_API_URL) process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: isCI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ],
  webServer: [
    {
      command: 'pnpm --filter @rdcs/web build && pnpm --filter @rdcs/web start',
      port: 3000,
      timeout: 180000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
        PORT: '3000',
      },
    },
    {
      command: 'pnpm --filter @rdcs/database db:generate && pnpm --filter @rdcs/database db:migrate:deploy && pnpm --filter @rdcs/database db:seed && pnpm --filter @rdcs/database build && pnpm --filter @rdcs/api build && pnpm --filter @rdcs/api start',
      port: 3001,
      timeout: 180000,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || DEFAULT_DB_URL,
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/0',
        JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-with-sufficient-length-32+',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-with-sufficient-length',
        WEB_ORIGINS: 'http://localhost:3000',
        NODE_ENV: 'development',
        SKIP_DB_CONNECT: process.env.SKIP_DB_CONNECT || '0',
      },
    },
  ],
});
