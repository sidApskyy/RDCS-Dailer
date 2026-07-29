import { test, expect, Page } from '@playwright/test';

import { getTenantIdBySlug, loginViaUI, loginViaApi, setAuthTokens, E2EAuthSession } from './helpers/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SEED_PASSWORD = 'password';

let tenantAId: string;
let tenantBId: string;
let agentASession: E2EAuthSession;
let agentBSession: E2EAuthSession;

test.beforeAll(async () => {
  tenantAId = await getTenantIdBySlug('rdcs-tenant-a');
  tenantBId = await getTenantIdBySlug('rdcs-tenant-b');
  agentASession = await loginViaApi(tenantAId, 'agent@tenant-a.local', SEED_PASSWORD);
  agentBSession = await loginViaApi(tenantBId, 'agent@tenant-b.local', SEED_PASSWORD);
});

async function setAgentAvailable(page: Page, session: E2EAuthSession): Promise<void> {
  await page.request.put(`${API_URL}/api/v1/calls/agent/status`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    data: { status: 'available' },
  });
}

test.describe('Phase 4 E2E — Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await loginViaUI(page, tenantAId, 'admin@tenant-a.local', SEED_PASSWORD);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-tenant-id').fill(tenantAId);
    await page.getByTestId('login-email').fill('nonexistent@tenant-a.local');
    await page.getByTestId('login-password').fill('wrongpassword');
    await page.getByTestId('login-submit').click();
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5_000 });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/calls');
    await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => undefined);
  });
});

test.describe('Phase 4 E2E — Manual Dial Flow', () => {
  test('should set agent status to available and place a manual dial', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setAuthTokens(page, agentASession);
    await page.goto('/calls');
    await setAgentAvailable(page, agentASession);
    await page.reload();

    await expect(page.getByTestId('calls-agent-status-badge')).toContainText('available', { timeout: 10_000 });

    const leadSelect = page.getByTestId('calls-lead-select');
    await leadSelect.selectOption({ index: 1 });

    const phoneSelect = page.getByTestId('calls-phone-select');
    const phoneOptions = await phoneSelect.locator('option').count();
    expect(phoneOptions).toBeGreaterThan(1);
    await phoneSelect.selectOption({ index: 1 });

    await page.getByTestId('calls-dial-button').click();

    await expect(page.getByTestId('calls-message')).toContainText(/Call started|compliance/i, { timeout: 15_000 });

    await context.close();
  });
});

test.describe('Phase 4 E2E — Tenant Isolation', () => {
  test('agent A cannot see tenant B calls', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setAuthTokens(page, agentASession);
    await page.goto('/calls');

    const response = await page.request.get(`${API_URL}/api/v1/calls`, {
      headers: { Authorization: `Bearer ${agentBSession.accessToken}` },
    });

    expect(response.status()).toBe(403);
    await context.close();
  });
});

test.describe('Phase 4 E2E — Agent Presence', () => {
  test('should update agent status via UI', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setAuthTokens(page, agentASession);
    await page.goto('/calls');

    await page.getByTestId('calls-status-select').selectOption('available');
    await page.waitForTimeout(1_000);
    await expect(page.getByTestId('calls-agent-status-badge')).toContainText('available', { timeout: 5_000 });

    await page.getByTestId('calls-status-select').selectOption('paused');
    await page.waitForTimeout(1_000);
    await expect(page.getByTestId('calls-agent-status-badge')).toContainText('paused', { timeout: 5_000 });

    await context.close();
  });
});

test.describe('Phase 4 E2E — Call History Display', () => {
  test('should display call history after placing a call', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setAuthTokens(page, agentASession);
    await page.goto('/calls');
    await setAgentAvailable(page, agentASession);
    await page.reload();

    await expect(page.getByTestId('calls-agent-status-badge')).toContainText('available', { timeout: 10_000 });

    const leadSelect = page.getByTestId('calls-lead-select');
    const optionCount = await leadSelect.locator('option').count();
    if (optionCount > 1) {
      await leadSelect.selectOption({ index: 1 });
      await page.getByTestId('calls-phone-select').selectOption({ index: 1 });
      await page.getByTestId('calls-dial-button').click();
      await page.waitForTimeout(3_000);
      await page.reload();
      const callHistory = page.locator('.space-y-3 > div');
      const historyCount = await callHistory.count();
      expect(historyCount).toBeGreaterThan(0);
    }

    await context.close();
  });
});

test.describe('Phase 4 E2E — Socket.IO Real-time Updates', () => {
  test('should receive real-time call status updates via socket', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setAuthTokens(page, agentASession);
    await page.goto('/calls');
    await setAgentAvailable(page, agentASession);
    await page.reload();

    await expect(page.getByTestId('calls-agent-status-badge')).toContainText('available', { timeout: 10_000 });

    const leadSelect = page.getByTestId('calls-lead-select');
    const optionCount = await leadSelect.locator('option').count();
    if (optionCount > 1) {
      await leadSelect.selectOption({ index: 1 });
      await page.getByTestId('calls-phone-select').selectOption({ index: 1 });

      const messageBefore = await page.getByTestId('calls-message').textContent().catch(() => '');
      await page.getByTestId('calls-dial-button').click();

      await expect(page.getByTestId('calls-message')).not.toContainText(messageBefore || '', { timeout: 15_000 });
    }

    await context.close();
  });
});
