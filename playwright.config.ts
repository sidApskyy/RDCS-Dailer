import { defineConfig, devices } from '@playwright/test';

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
      command: 'pnpm --filter @rdcs/web dev',
      port: 3000,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
      },
    },
    {
      command: 'pnpm --filter @rdcs/api dev',
      port: 3001,
      timeout: 120000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rdcs_test',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379/0',
        JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-with-sufficient-length-32+',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-with-sufficient-length',
        WEB_ORIGINS: 'http://localhost:3000',
        NODE_ENV: 'development',
      },
    },
  ],
});
