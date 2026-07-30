/* CI-only: Verifies E2E auth preconditions without exposing secrets */
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

async function main() {
  console.log('[E2E AUTH VERIFY] Starting');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[E2E AUTH VERIFY] DATABASE_URL missing');
    process.exit(1);
  }
  const expectedPassword = process.env.E2E_PASSWORD || 'password';
  const tenantSlug = process.env.E2E_TENANT_SLUG || 'rdcs-tenant-a';
  const userEmail = process.env.E2E_USER_EMAIL || 'agent@tenant-a.local';

  const u = new URL(dbUrl);
  console.log(`[E2E AUTH VERIFY] DB host=${u.hostname} db=${u.pathname.replace('/', '')}`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('[E2E AUTH VERIFY] Database connection: PASS');
  try {
    const tRes = await client.query('SELECT id, slug FROM tenants WHERE slug = $1', [tenantSlug]);
    const tenant = tRes.rows[0];
    const tenantExists = !!tenant;
    console.log(`[E2E AUTH VERIFY] Tenant lookup: ${tenantExists ? 'PASS' : 'FAIL'}`);
    if (!tenantExists) {
      process.exit(1);
    }
    const tenantId = tenant.id as string;
    console.log(`[E2E AUTH VERIFY] tenantId: ${tenantId}`);

    const uRes = await client.query('SELECT id, tenant_id, status, locked_until, password_hash FROM users WHERE email = $1', [userEmail]);
    const user = uRes.rows[0];
    const userExists = !!user;
    console.log(`[E2E AUTH VERIFY] User lookup: ${userExists ? 'PASS' : 'FAIL'}`);
    if (!userExists) process.exit(1);

    const tenantMatch = user.tenant_id === tenantId;
    console.log(`[E2E AUTH VERIFY] User tenant consistency: ${tenantMatch ? 'PASS' : 'FAIL'}`);
    if (!tenantMatch) process.exit(1);

    const active = user.status === 'active';
    console.log(`[E2E AUTH VERIFY] User active: ${active ? 'PASS' : 'FAIL'}`);
    if (!active) process.exit(1);

    const locked = user.locked_until && new Date(user.locked_until) > new Date();
    console.log(`[E2E AUTH VERIFY] User lock state: ${locked ? 'FAIL' : 'PASS'}`);
    if (locked) process.exit(1);

    const hash = user.password_hash as string | null;
    const hashPresent = !!hash && hash.length > 0;
    console.log(`[E2E AUTH VERIFY] Password hash present: ${hashPresent ? 'PASS' : 'FAIL'}`);
    if (!hashPresent) process.exit(1);

    const passOk = await bcrypt.compare(expectedPassword, hash!);
    console.log(`[E2E AUTH VERIFY] Password verification: ${passOk ? 'PASS' : 'FAIL'}`);
    if (!passOk) process.exit(1);

    console.log('[E2E AUTH VERIFY] RESULT: PASS');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[E2E AUTH VERIFY] ERROR', err?.message || err);
  process.exit(1);
});
