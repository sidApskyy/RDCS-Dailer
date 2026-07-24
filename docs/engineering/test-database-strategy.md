# Test Database Strategy

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform services

---

## Overview

This document defines the test database strategy for the RDCS In-House Dialer Platform. The strategy ensures isolated, deterministic, and fast database operations for testing.

---

## Database Configuration

### Test Database

**Name:** `rdcs_test`

**Schema:** `test`

**Connection String:** `postgresql://rdcs:rdcs@localhost:5432/rdcs_test?schema=test`

**Purpose:** Isolated database for integration and E2E tests

---

## Database Setup

### Initial Setup

Create the test database:

```sql
-- Connect to PostgreSQL
psql -U rdcs -d postgres

-- Create test database
CREATE DATABASE rdcs_test;

-- Connect to test database
\c rdcs_test

-- Create test schema
CREATE SCHEMA test;
```

### Docker Compose

Add test database to Docker Compose:

```yaml
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: rdcs
      POSTGRES_PASSWORD: rdcs
      POSTGRES_DB: rdcs_test
    ports:
      - "5433:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data

volumes:
  postgres-test-data:
```

---

## Migration Strategy

### Test Migrations

Run migrations on test database:

```bash
# Set test database URL
export DATABASE_URL="postgresql://rdcs:rdcs@localhost:5433/rdcs_test?schema=test"

# Run migrations
pnpm --filter @rdcs/database db:migrate:dev
```

### Automatic Migration

Configure Jest to run migrations before tests:

```typescript
// apps/api/test/setup.ts
import { execSync } from 'child_process';

beforeAll(async () => {
  execSync('pnpm --filter @rdcs/database db:migrate:dev', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
});
```

---

## Seeding Strategy

### Deterministic Seed Data

Use deterministic seed data for reproducible tests:

```typescript
// apps/database/prisma/seed.test.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestDatabase() {
  await prisma.user.create({
    data: {
      id: 'clm123abc',
      email: 'test@example.com',
      name: 'Test User',
      role: 'AGENT',
    },
  });

  await prisma.call.create({
    data: {
      id: 'clm456def',
      phoneNumber: '+1234567890',
      status: 'COMPLETED',
      userId: 'clm123abc',
    },
  });
}

seedTestDatabase()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

### Seed Before Tests

Run seed before each test suite:

```typescript
// apps/api/test/setup.ts
beforeEach(async () => {
  await execSync('pnpm --filter @rdcs/database db:seed', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
});
```

---

## Cleanup Strategy

### Schema Cleanup

Drop and recreate schema before each test:

```typescript
// apps/api/test/setup.ts
beforeEach(async () => {
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS test CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA test');
  await prisma.$executeRawUnsafe('SET search_path TO test');
});
```

### Truncate Tables

Truncate tables for faster cleanup:

```typescript
// apps/api/test/setup.ts
beforeEach(async () => {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'test'
  `;

  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE test.${tablename} CASCADE`);
  }
});
```

### Transaction Rollback

Use transactions for isolated tests:

```typescript
// apps/api/test/setup.ts
beforeEach(async () => {
  await prisma.$transaction(async (tx) => {
    // Test code here
  });
});
```

---

## Test Factories

### User Factory

```typescript
// apps/api/test/factories/user.factory.ts
export const userFactory = async (overrides = {}) => {
  return prisma.user.create({
    data: {
      id: 'clm123abc',
      email: 'test@example.com',
      name: 'Test User',
      role: 'AGENT',
      ...overrides,
    },
  });
};
```

### Call Factory

```typescript
// apps/api/test/factories/call.factory.ts
export const callFactory = async (overrides = {}) => {
  return prisma.call.create({
    data: {
      id: 'clm456def',
      phoneNumber: '+1234567890',
      status: 'PENDING',
      userId: 'clm123abc',
      ...overrides,
    },
  });
};
```

---

## Jest Configuration

### Test Database URL

Add test database URL to Jest config:

```javascript
// apps/api/jest.config.js
module.exports = {
  setupFiles: ['./test/setup.ts'],
  testEnvironment: 'node',
  globals: {
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  },
};
```

### Setup File

Create test setup file:

```typescript
// apps/api/test/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS test CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA test');
  await prisma.$executeRawUnsafe('SET search_path TO test');
});

global.prisma = prisma;
```

---

## Environment Variables

### .env.test

Create test environment file:

```env
NODE_ENV=test
DATABASE_URL=postgresql://rdcs:rdcs@localhost:5433/rdcs_test?schema=test
REDIS_URL=redis://:rdcs@localhost:6380/1
JWT_SECRET=test-secret-min-32-chars-for-testing-only
LOG_LEVEL=error
```

### Load Test Environment

Load test environment for tests:

```bash
# Run tests with test environment
NODE_ENV=test pnpm test
```

---

## Performance Optimization

### Connection Pooling

Use connection pooling for faster tests:

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
  log: ['error'],
});
```

### Parallel Tests

Run tests in parallel with isolated databases:

```javascript
// apps/api/jest.config.js
module.exports = {
  maxWorkers: 4,
  testTimeout: 10000,
};
```

### In-Memory Database

Consider using in-memory database for faster tests:

```typescript
// Use SQLite for unit tests
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./test.db',
    },
  },
});
```

---

## Troubleshooting

### Database Connection Failed

1. Check test database is running
2. Check connection string is correct
3. Check database credentials
4. Check port is not in use

### Migration Failed

1. Check migration files exist
2. Check migration order
3. Check database schema
4. Check for conflicts

### Seed Failed

1. Check seed data is valid
2. Check for duplicate data
3. Check foreign key constraints
4. Check data types

### Cleanup Failed

1. Check for active connections
2. Check for locked tables
3. Check for cascade constraints
4. Check permissions

---

## Best Practices

### Isolation

- Use separate test database
- Use separate test schema
- Clean up after each test
- Use transactions for isolation

### Determinism

- Use deterministic seed data
- Use fixed IDs for test data
- Use fixed timestamps
- Avoid random data

### Performance

- Use connection pooling
- Use parallel execution
- Use in-memory database when possible
- Optimize cleanup strategy

### Maintenance

- Keep seed data up to date
- Update migrations regularly
- Clean up old test data
- Monitor test database size

---

## Resources

- [Prisma Testing](https://www.prisma.io/docs/guides/testing/integration-testing)
- [PostgreSQL Testing](https://www.postgresql.org/docs/current/regress.html)
- [Jest Database Setup](https://jestjs.io/docs/configuration#setupfiles-array)
