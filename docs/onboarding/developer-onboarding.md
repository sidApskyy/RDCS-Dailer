# Developer Onboarding Guide

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Audience:** New Developers

---

## Welcome to RDCS Dialer Platform

This guide will help you get started with the RDCS In-House Dialer Platform. Follow these steps to set up your development environment and start contributing.

---

## Prerequisites

### Required Software

- **Node.js:** v20.17.0 or higher
- **pnpm:** v9.0.0 or higher
- **Docker:** Latest version (for infrastructure services)
- **Docker Compose:** Latest version
- **Git:** Latest version

### Optional Software

- **VS Code:** Recommended IDE
- **Postman:** For API testing
- **DBeaver:** For database management

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rdcs-dialer-platform
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration. See [Environment Configuration](./engineering/environment-configuration.md) for details.

### 4. Start Infrastructure Services

```bash
pnpm dev:infra
```

This starts PostgreSQL, Redis, and MinIO using Docker Compose.

### 5. Run Database Migrations

```bash
pnpm db:migrate:dev
```

### 6. Seed the Database

```bash
pnpm db:seed
```

### 7. Start Development Servers

```bash
# Start all services
pnpm dev

# Or start individual services
pnpm --filter @rdcs/api dev
pnpm --filter @rdcs/web dev
pnpm --filter @rdcs/worker dev
pnpm --filter @rdcs/socket dev
```

---

## Project Structure

```
rdcs-dialer-platform/
├── apps/
│   ├── api/          # NestJS API service
│   ├── web/          # Next.js frontend
│   ├── worker/       # BullMQ worker service
│   └── socket/       # Socket.IO gateway
├── packages/
│   ├── database/     # Prisma schema and migrations
│   ├── shared-types/ # Shared TypeScript types
│   ├── eslint-config/# Shared ESLint configuration
│   └── tsconfig/     # Shared TypeScript configuration
├── docs/
│   ├── engineering/  # Engineering documentation
│   ├── onboarding/   # Onboarding guides
│   └── audits/       # Audit reports
├── docker/           # Docker Compose files
└── .github/          # GitHub Actions workflows
```

---

## Development Workflow

### Code Quality

Before committing code, ensure:

1. **Linting passes:**
   ```bash
   pnpm lint
   ```

2. **Type checking passes:**
   ```bash
   pnpm typecheck
   ```

3. **Formatting is correct:**
   ```bash
   pnpm format:check
   # Or auto-format:
   pnpm format
   ```

4. **Tests pass:**
   ```bash
   pnpm test
   ```

### Commit Messages

Follow the conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example:**
```
feat(api): add user authentication

Implement JWT-based authentication for user login and registration.
```

See [Git and Commit Standards](./engineering/git-standards.md) for details.

---

## Key Services

### API Service

**Port:** 3001

**Framework:** NestJS

**Purpose:** REST API for the platform

**Health Check:** http://localhost:3001/health

**API Documentation:** http://localhost:3001/api/docs

### Web Frontend

**Port:** 3000

**Framework:** Next.js

**Purpose:** React-based user interface

**Health Check:** http://localhost:3000

### Worker Service

**Framework:** BullMQ

**Purpose:** Background job processing

**Health Check:** Check logs for "RDCS worker started"

### Socket Service

**Port:** 3002

**Framework:** Socket.IO

**Purpose:** Real-time communication

**Health Check:** Check logs for "RDCS socket gateway running"

---

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm --filter @rdcs/api test:watch
pnpm --filter @rdcs/web test:watch
```

### E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

### Test Coverage

```bash
# Generate coverage report
pnpm --filter @rdcs/api test:coverage
pnpm --filter @rdcs/web test:coverage
```

See [Testing Strategy](./engineering/testing-strategy.md) for details.

---

## Database

### Prisma Client

Access the database using Prisma:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = await prisma.user.findMany();
```

### Migrations

Create a new migration:

```bash
pnpm --filter @rdcs/database db:migrate:dev --name <migration-name>
```

### Seed Data

Reseed the database:

```bash
pnpm db:seed
```

See [Seed Data Documentation](./engineering/seed-data.md) for details.

---

## Logging

### Structured Logging

Use the structured logger in all services:

```typescript
// API
import { LoggerService } from './common/logger/logger.service';

logger.info('User logged in', { userId: user.id });

// Worker/Socket
import { logger } from './logger';

logger.info('Job processed', { jobId: job.id });
```

See [Logging Standards](./engineering/logging-standards.md) for details.

---

## Request Correlation

All requests include a correlation ID for tracing:

```typescript
// API
logger.info('Processing request', { requestId: request.id });

// Worker
logger.info('Processing job', { requestId: job.data.requestId });
```

See [Request Correlation](./engineering/request-correlation.md) for details.

---

## Common Tasks

### Add a New API Endpoint

1. Create a controller in `apps/api/src/<module>/<module>.controller.ts`
2. Create a service in `apps/api/src/<module>/<module>.service.ts`
3. Create a module in `apps/api/src/<module>/<module>.module.ts`
4. Import the module in `apps/api/src/app.module.ts`
5. Add tests in `apps/api/src/<module>/<module>.spec.ts`

### Add a New Database Model

1. Add the model to `packages/database/prisma/schema.prisma`
2. Generate the Prisma client:
   ```bash
   pnpm db:generate
   ```
3. Create a migration:
   ```bash
   pnpm db:migrate:dev --name <migration-name>
   ```
4. Update seed data if needed

### Add a New Environment Variable

1. Add the variable to `.env.example`
2. Add validation to the service's `env.validation.ts`
3. Update the [Environment Configuration](./engineering/environment-configuration.md) documentation

---

## Troubleshooting

### Port Already in Use

If a port is already in use:

```bash
# Find the process using the port
netstat -ano | findstr :3001

# Kill the process (Windows)
taskkill /PID <PID> /F

# Kill the process (Linux/Mac)
kill -9 <PID>
```

### Database Connection Failed

1. Check PostgreSQL is running:
   ```bash
   docker ps
   ```

2. Check connection string in `.env`

3. Restart infrastructure:
   ```bash
   pnpm dev:infra:down
   pnpm dev:infra
   ```

### Redis Connection Failed

1. Check Redis is running:
   ```bash
   docker ps
   ```

2. Check connection string in `.env`

3. Restart infrastructure:
   ```bash
   pnpm dev:infra:down
   pnpm dev:infra
   ```

### Build Errors

1. Clear node_modules:
   ```bash
   rm -rf node_modules
   pnpm install
   ```

2. Clear build artifacts:
   ```bash
   rm -rf apps/*/dist
   pnpm build
   ```

---

## Resources

### Documentation

- [Code Quality Standards](./engineering/code-quality-standards.md)
- [Git and Commit Standards](./engineering/git-standards.md)
- [Request Correlation](./engineering/request-correlation.md)
- [Logging Standards](./engineering/logging-standards.md)
- [Environment Configuration](./engineering/environment-configuration.md)
- [Testing Strategy](./engineering/testing-strategy.md)
- [Test Database Strategy](./engineering/test-database-strategy.md)
- [Test Redis Strategy](./engineering/test-redis-strategy.md)
- [Seed Data](./engineering/seed-data.md)

### External Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Socket.IO Documentation](https://socket.io/docs/v4/)

---

## Getting Help

If you need help:

1. Check the documentation in `docs/`
2. Check existing issues in the repository
3. Ask in the team communication channel
4. Create a new issue with detailed information

---

## Next Steps

1. Complete the setup steps above
2. Read the engineering documentation
3. Explore the codebase
4. Start with a small task or bug fix
5. Ask for a code review before merging

Happy coding!
