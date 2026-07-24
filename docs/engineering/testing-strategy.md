# Testing Strategy

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform services

---

## Overview

This document defines the testing strategy for the RDCS In-House Dialer Platform. The strategy includes unit tests, integration tests, and end-to-end tests across all services.

---

## Testing Pyramid

```
        E2E Tests (Playwright)
       /                      \
      /                        \
     /                          \
    /                            \
   /                              \
  /                                \
 /                                  \
Integration Tests (Jest/Vitest)     \
                                      \
                                       \
                                        \
                                         \
                                          \
                                           \
                                            Unit Tests (Jest/Vitest)
```

- **Unit Tests:** 70% - Fast, isolated tests for individual functions and classes
- **Integration Tests:** 20% - Tests for service interactions and database operations
- **E2E Tests:** 10% - Tests for critical user flows across the entire system

---

## Test Types

### Unit Tests

**Purpose:** Test individual functions, classes, and modules in isolation

**Tools:**
- **API:** Jest with `@nestjs/testing`
- **Web:** Vitest with `@testing-library/react`

**Coverage Target:** 80%+

**Examples:**
- Service methods
- Utility functions
- DTO validation
- Custom validators
- Helper functions

**Guidelines:**
- Mock external dependencies
- Test edge cases
- Test error handling
- Keep tests fast (< 100ms each)

---

### Integration Tests

**Purpose:** Test interactions between components and external services

**Tools:**
- **API:** Jest with test database
- **Web:** Vitest with mocked API

**Coverage Target:** 60%+

**Examples:**
- Controller + Service integration
- Database operations
- Redis operations
- API endpoint tests
- Socket event handling

**Guidelines:**
- Use test database
- Use test Redis instance
- Mock external APIs
- Test error scenarios
- Clean up after tests

---

### End-to-End Tests

**Purpose:** Test critical user flows across the entire system

**Tools:**
- **All Services:** Playwright

**Coverage Target:** Critical paths only

**Examples:**
- User login flow
- Call initiation flow
- Dashboard navigation
- Real-time updates
- Error recovery

**Guidelines:**
- Test only critical paths
- Use deterministic data
- Test across browsers
- Test responsive design
- Keep tests stable

---

## Service-Specific Testing

### API Service

**Test Framework:** Jest

**Configuration:** `apps/api/jest.config.js`

**Test Location:** `apps/api/src/**/*.spec.ts`

**Test Database:** Separate test database schema

**Test Redis:** Separate test Redis database

**Setup:**
```typescript
// e2e/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
```

**Scripts:**
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage

---

### Web Frontend

**Test Framework:** Vitest

**Configuration:** `apps/web/vitest.config.ts`

**Test Location:** `apps/web/src/**/*.spec.ts`

**Setup:** `apps/web/src/test/setup.ts`

**Example:**
```typescript
// components/Button.spec.ts
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Scripts:**
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage

---

### E2E Tests

**Test Framework:** Playwright

**Configuration:** `playwright.config.ts`

**Test Location:** `e2e/**/*.spec.ts`

**Example:**
```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
});
```

**Scripts:**
- `pnpm test:e2e` - Run all E2E tests
- `pnpm test:e2e:ui` - Run E2E tests with UI
- `pnpm test:e2e:debug` - Run E2E tests in debug mode

---

## Test Database Strategy

### PostgreSQL Test Database

**Purpose:** Isolated database for integration tests

**Configuration:**
- Separate schema: `test`
- Separate database: `rdcs_test`
- Auto-migration before tests
- Auto-cleanup after tests

**Setup:**
```typescript
// test-setup.ts
beforeAll(async () => {
  await prisma.$connect();
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS test CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA test');
  await prisma.$executeRawUnsafe('SET search_path TO test');
});

afterAll(async () => {
  await prisma.$executeRawUnsafe('DROP SCHEMA test CASCADE');
  await prisma.$disconnect();
});
```

**Seeding:**
- Use deterministic seed data
- Reset before each test
- Clean up after each test

---

## Test Redis Strategy

### Redis Test Instance

**Purpose:** Isolated Redis for integration tests

**Configuration:**
- Separate database: `1`
- Flush before tests
- Flush after tests

**Setup:**
```typescript
// test-setup.ts
beforeAll(async () => {
  await redis.select(1);
  await redis.flushdb();
});

afterAll(async () => {
  await redis.flushdb();
  await redis.quit();
});
```

---

## Test Factories

### Purpose

Create test data efficiently without hardcoding values

### Implementation

Use factory functions to generate test data:

```typescript
// factories/user.factory.ts
export const userFactory = (overrides = {}) => ({
  id: 'clm123abc',
  email: 'test@example.com',
  name: 'Test User',
  role: 'AGENT',
  ...overrides,
});
```

### Usage

```typescript
const user = userFactory({ role: 'ADMIN' });
```

---

## Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests:** 80% line coverage
- **Integration Tests:** 60% line coverage
- **E2E Tests:** Critical paths only

### Exclusions

- DTO files
- Interface files
- Configuration files
- Main entry points
- Test files

### Reporting

- Coverage reports generated in `coverage/` directory
- HTML report for detailed analysis
- LCOV report for CI integration

---

## CI/CD Integration

### GitHub Actions

Tests run on:
- Every pull request
- Every push to main
- Before deployment

### Test Matrix

- Node.js: 20.x
- OS: Ubuntu, Windows, macOS
- Browsers: Chrome, Firefox, Safari (E2E)

### Failure Conditions

- Any test failure blocks merge
- Coverage below threshold blocks merge
- Lint errors block merge

---

## Best Practices

### Test Organization

- Group related tests with `describe`
- Use descriptive test names
- One assertion per test when possible
- Arrange-Act-Assert pattern

### Test Data

- Use deterministic data
- Avoid random data in tests
- Use factories for complex data
- Clean up after tests

### Mocking

- Mock external dependencies
- Mock only what's necessary
- Keep mocks simple
- Verify mock calls

### Performance

- Keep unit tests fast
- Use parallel execution
- Cache test dependencies
- Optimize database operations

### Maintenance

- Update tests with code changes
- Remove obsolete tests
- Refactor test utilities
- Document complex tests

---

## Troubleshooting

### Tests Fail Locally

1. Check test database is running
2. Check test Redis is running
3. Check environment variables
4. Check for port conflicts
5. Clear test database

### Tests Fail in CI

1. Check CI environment variables
2. Check service dependencies
3. Check test timeout settings
4. Check browser versions
5. Review CI logs

### Flaky Tests

1. Add retries for network tests
2. Add explicit waits for async operations
3. Use deterministic test data
4. Isolate test dependencies
5. Increase test timeout

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
