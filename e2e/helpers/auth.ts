import { Page, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rdcs_test';

export interface E2EAuthSession {
  tenantId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

async function queryTenantId(slug: string): Promise<string> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (result.rows.length === 0) throw new Error(`Tenant not found: ${slug}`);
    return result.rows[0].id;
  } finally {
    await client.end();
  }
}

export async function getTenantIdBySlug(slug: string): Promise<string> {
  return queryTenantId(slug);
}

export async function loginViaApi(tenantId: string, email: string, password: string): Promise<E2EAuthSession> {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Login failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  const payload = JSON.parse(atob(data.accessToken.split('.')[1]));

  return {
    tenantId,
    userId: payload.sub,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

export async function loginViaUI(page: Page, tenantId: string, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-tenant-id').fill(tenantId);
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 10_000 });
}

export async function setAuthTokens(page: Page, session: E2EAuthSession): Promise<void> {
  await page.addInitScript((tokens) => {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens));
  }, { accessToken: session.accessToken, refreshToken: session.refreshToken });
}
