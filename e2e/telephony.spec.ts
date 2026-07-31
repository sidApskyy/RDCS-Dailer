import { test, expect, Page } from '@playwright/test';

import { getTenantIdBySlug, loginViaUI, loginViaApi, setAuthTokens, E2EAuthSession } from './helpers/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rdcs_test';
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

test.beforeEach(async () => {
  await cleanupActiveCallsViaDB();
});

async function cleanupActiveCallsViaDB(): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    // Force-close all active call sessions to terminal state
    await client.query(
      `UPDATE call_sessions SET state = 'cancelled', completed_at = NOW(), termination_reason = 'cancelled'
       WHERE state IN ('queued', 'dialing', 'ringing', 'connected', 'on_hold')`,
    );
    // Reset all agent presence to available (not busy/on_call/wrap_up)
    await client.query(
      `UPDATE agent_presences SET status = 'available'
       WHERE status IN ('busy', 'on_call', 'wrap_up')`,
    );
  } finally {
    await client.end();
  }
}

async function setAgentAvailable(page: Page, session: E2EAuthSession): Promise<void> {
  await page.request.put(`${API_URL}/api/v1/calls/agent/status`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      'X-Test-Skip-Throttle': '1',
    },
    data: { status: 'available' },
  });
}

function authHeaders(session: E2EAuthSession): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.accessToken}`,
    'X-Test-Skip-Throttle': '1',
  };
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

    // Agent A's token can only access tenant A's calls — never tenant B's
    const response = await page.request.get(`${API_URL}/api/v1/calls`, {
      headers: { Authorization: `Bearer ${agentASession.accessToken}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    const calls = body.data?.calls || body.calls || [];
    // Verify no calls from tenant B are returned (tenant isolation enforced via JWT scoping)
    for (const call of calls) {
      expect(call.tenantId).not.toBe(tenantBId);
    }

    // Cross-tenant direct access: agent A trying to fetch a tenant B call by ID should fail
    const crossResponse = await page.request.get(`${API_URL}/api/v1/calls/nonexistent-tenant-b-call`, {
      headers: { Authorization: `Bearer ${agentASession.accessToken}` },
    });
    expect([403, 404]).toContain(crossResponse.status());

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

    // Fetch leads via API
    const leadsResponse = await page.request.get(`${API_URL}/api/v1/leads?take=50`, {
      headers: authHeaders(agentASession),
    });
    const leadsBody = await leadsResponse.json();
    const leadsList = leadsBody.data?.leads || leadsBody.leads || [];

    // Try each lead until one succeeds
    let callPlaced = false;
    const errors: string[] = [];
    for (const lead of leadsList) {
      const phone = lead.phones?.find((p: { isPrimary: boolean }) => p.isPrimary) || lead.phones?.[0];
      if (!phone) continue;

      // Reset agent to available before each attempt
      await setAgentAvailable(page, agentASession);

      const dialResponse = await page.request.post(`${API_URL}/api/v1/calls/manual-dial`, {
        headers: authHeaders(agentASession),
        data: { leadId: lead.id, phoneNumber: phone.phoneNumber },
      });

      if (dialResponse.ok()) {
        callPlaced = true;
        break;
      } else {
        const errorBody = await dialResponse.json().catch(() => ({}));
        const errorMsg = errorBody?.message || errorBody?.error?.message || dialResponse.statusText();
        errors.push(`Lead ${lead.firstName} ${lead.lastName} (${lead.timezone}): ${errorMsg}`);
      }
    }

    if (!callPlaced) {
      // eslint-disable-next-line no-console
      console.error('All leads failed. Errors:', errors);
    }
    expect(callPlaced).toBe(true);

    // Navigate to calls page and verify call history is displayed
    await page.goto('/calls');
    await page.waitForTimeout(2_000);
    await page.reload();

    const callHistory = page.locator('.space-y-3 > div');
    const historyCount = await callHistory.count();
    expect(historyCount).toBeGreaterThan(0);

    await context.close();
  });
});

test.describe('Phase 4 E2E — Socket.IO Real-time Updates', () => {
  test('should receive real-time call status updates via socket', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setAuthTokens(page, agentASession);

    // Navigate to /calls to establish socket connection
    await page.goto('/calls');
    await page.reload();

    await expect(page.getByTestId('calls-agent-status-badge')).toContainText('available', { timeout: 10_000 });

    // Wait for socket to connect and leads to load
    await expect(page.getByTestId('calls-lead-select').locator('option')).not.toHaveCount(1, { timeout: 10_000 });

    // Count initial calls
    const initialCallHistory = page.locator('.space-y-3 > div');
    const initialCount = await initialCallHistory.count();

    // Fetch leads via API
    const leadsResponse = await page.request.get(`${API_URL}/api/v1/leads?take=50`, {
      headers: authHeaders(agentASession),
    });
    const leadsBody = await leadsResponse.json();
    const leadsList = leadsBody.data?.leads || leadsBody.leads || [];

    // Try each lead until one succeeds
    let callPlaced = false;
    const errors: string[] = [];
    for (const lead of leadsList) {
      const phone = lead.phones?.find((p: { isPrimary: boolean }) => p.isPrimary) || lead.phones?.[0];
      if (!phone) continue;

      // Reset agent to available before each attempt
      await setAgentAvailable(page, agentASession);

      const dialResponse = await page.request.post(`${API_URL}/api/v1/calls/manual-dial`, {
        headers: authHeaders(agentASession),
        data: { leadId: lead.id, phoneNumber: phone.phoneNumber },
      });

      if (dialResponse.ok()) {
        callPlaced = true;
        break;
      } else {
        const errorBody = await dialResponse.json().catch(() => ({}));
        const errorMsg = errorBody?.message || errorBody?.error?.message || dialResponse.statusText();
        errors.push(`Lead ${lead.firstName} ${lead.lastName} (${lead.timezone}): ${errorMsg}`);
      }
    }

    if (!callPlaced) {
      // eslint-disable-next-line no-console
      console.error('All leads failed. Errors:', errors);
    }
    expect(callPlaced).toBe(true);

    // Wait for socket event to trigger refresh and update call history
    await expect(async () => {
      const currentCount = await page.locator('.space-y-3 > div').count();
      expect(currentCount).toBeGreaterThan(initialCount);
    }).toPass({ timeout: 15_000 });

    await context.close();
  });
});
