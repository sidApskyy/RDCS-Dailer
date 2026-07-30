import { Page, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rdcs_test';

let __loggedEnvOnce = false;
function logEnvOnce() {
  if (__loggedEnvOnce) return;
  __loggedEnvOnce = true;
  try {
    const url = new URL(DATABASE_URL);
    // Safe, sanitized: no username/password
    // eslint-disable-next-line no-console
    console.log(`[E2E] API_URL=${API_URL} DB=${url.hostname}:${url.port}${url.pathname}`);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[E2E] API_URL=${API_URL} DB=<unparsable>`);
  }
}

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
    logEnvOnce();
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
    let message = response.statusText;
    try {
      const error = await response.json();
      message = (error?.error?.message || error?.data?.message || error?.message || message) as string;
    } catch {}
    throw new Error(`Login failed [${response.status}]: ${message} (tenantId=${tenantId}, email=${email})`);
  }

  const data = await response.json();
  const tokens = data.data || data;
  const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));

  return {
    tenantId,
    userId: payload.sub,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
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
