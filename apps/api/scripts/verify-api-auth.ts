/* CI-only: Verifies API authentication by performing a real HTTP login without exposing secrets */
import { Client } from 'pg';

async function getTenantId(dbUrl: string, slug: string): Promise<string> {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const res = await client.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (res.rows.length === 0) throw new Error('Tenant not found');
    return res.rows[0].id as string;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('[E2E API AUTH VERIFY] Starting');
  const dbUrl = process.env.DATABASE_URL as string | undefined;
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL as string | undefined) || 'http://localhost:3001';
  const email = process.env.E2E_USER_EMAIL || 'agent@tenant-a.local';
  const password = process.env.E2E_PASSWORD || 'password';
  const slug = process.env.E2E_TENANT_SLUG || 'rdcs-tenant-a';

  if (!dbUrl) {
    console.error('[E2E API AUTH VERIFY] DATABASE_URL missing');
    process.exit(1);
  }

  const tenantId = await getTenantId(dbUrl, slug);
  console.log(`[E2E API AUTH VERIFY] tenantId: ${tenantId}`);

  const resp = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    },
    body: JSON.stringify({ email, password }),
  });

  console.log(`[E2E API AUTH VERIFY] HTTP status: ${resp.status}`);
  if (!resp.ok) {
    try {
      const err = await resp.json();
      const msg = (err?.error?.message || err?.message || resp.statusText) as string;
      console.log(`[E2E API AUTH VERIFY] Authentication: FAIL (${msg})`);
    } catch {
      console.log('[E2E API AUTH VERIFY] Authentication: FAIL');
    }
    process.exit(1);
  }

  console.log('[E2E API AUTH VERIFY] Authentication: PASS');
}

main().catch((err) => {
  console.error('[E2E API AUTH VERIFY] ERROR', err?.message || err);
  process.exit(1);
});
