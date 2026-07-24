# Environment Configuration

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform services

---

## Overview

This document defines the environment variable configuration for the RDCS In-House Dialer Platform. All services use environment variables for configuration, with validation at startup to ensure required variables are present and correctly formatted.

---

## Environment Variables

### Common Variables

#### NODE_ENV
- **Description:** Application environment
- **Values:** `development`, `production`, `test`
- **Default:** `development`
- **Required:** No
- **Validation:** Enum validation

#### LOG_LEVEL
- **Description:** Logging verbosity level
- **Values:** `error`, `warn`, `info`, `debug`, `verbose`
- **Default:** `info` (production), `debug` (development)
- **Required:** No
- **Validation:** Enum validation

---

### API Service Variables

#### API_PORT
- **Description:** API server port
- **Values:** Valid port number (1-65535)
- **Default:** `3001`
- **Required:** No
- **Validation:** Numeric string

#### DATABASE_URL
- **Description:** PostgreSQL connection string
- **Format:** `postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]`
- **Example:** `postgresql://rdcs:rdcs@localhost:5432/rdcs?schema=public`
- **Required:** Yes
- **Validation:** URL format

#### REDIS_URL
- **Description:** Redis connection string
- **Format:** `redis://:[password]@[host]:[port]/[db]`
- **Example:** `redis://:rdcs@localhost:6379/0`
- **Required:** Yes
- **Validation:** URL format

#### JWT_SECRET
- **Description:** Secret key for JWT token signing
- **Format:** Minimum 32 characters
- **Required:** Yes
- **Validation:** Minimum length check
- **Security:** Must be kept secret, use strong random string in production

#### JWT_EXPIRES_IN
- **Description:** JWT token expiration time
- **Format:** Duration string (e.g., `1d`, `1h`, `30m`)
- **Default:** `1d`
- **Required:** No
- **Validation:** String format

#### WEB_ORIGIN
- **Description:** CORS allowed origin for web frontend
- **Format:** Valid URL
- **Example:** `http://localhost:3000`
- **Required:** No
- **Validation:** URL format

---

### Worker Service Variables

#### REDIS_URL
- **Description:** Redis connection string for BullMQ
- **Format:** `redis://:[password]@[host]:[port]/[db]`
- **Example:** `redis://:rdcs@localhost:6379/0`
- **Required:** Yes
- **Validation:** URL format

---

### Socket Service Variables

#### SOCKET_PORT
- **Description:** Socket.IO server port
- **Values:** Valid port number (1-65535)
- **Default:** `3002`
- **Required:** No
- **Validation:** Numeric string

#### REDIS_URL
- **Description:** Redis connection string for adapter
- **Format:** `redis://:[password]@[host]:[port]/[db]`
- **Example:** `redis://:rdcs@localhost:6379/0`
- **Required:** Yes
- **Validation:** URL format

#### WEB_ORIGIN
- **Description:** CORS allowed origin for web frontend
- **Format:** Valid URL
- **Example:** `http://localhost:3000`
- **Required:** No
- **Validation:** URL format

---

### Web Frontend Variables

#### NEXT_PUBLIC_API_URL
- **Description:** API base URL for frontend
- **Format:** Valid URL
- **Example:** `http://localhost:3001`
- **Required:** Yes
- **Validation:** URL format

---

### Infrastructure Variables

#### POSTGRES_USER
- **Description:** PostgreSQL username
- **Required:** Yes (for Docker Compose)
- **Default:** `rdcs`

#### POSTGRES_PASSWORD
- **Description:** PostgreSQL password
- **Required:** Yes (for Docker Compose)
- **Default:** `rdcs`

#### POSTGRES_DB
- **Description:** PostgreSQL database name
- **Required:** Yes (for Docker Compose)
- **Default:** `rdcs`

#### REDIS_PASSWORD
- **Description:** Redis password
- **Required:** Yes (for Docker Compose)
- **Default:** `rdcs`

#### MINIO_ROOT_USER
- **Description:** MinIO access key
- **Required:** Yes (for Docker Compose)
- **Default:** `minio`

#### MINIO_ROOT_PASSWORD
- **Description:** MinIO secret key
- **Required:** Yes (for Docker Compose)
- **Default:** `minio123456`

#### MINIO_ENDPOINT
- **Description:** MinIO server endpoint
- **Format:** Valid URL
- **Example:** `http://localhost:9000`
- **Required:** Yes (for Docker Compose)
- **Default:** `http://localhost:9000`

#### MINIO_BUCKET
- **Description:** MinIO bucket name for recordings
- **Required:** Yes (for Docker Compose)
- **Default:** `rdcs-recordings`

---

## Environment Validation

### Validation Process
Each service validates environment variables at startup using Zod schemas:

1. Load environment variables from `process.env`
2. Parse against service-specific schema
3. If validation fails:
   - Log missing variables
   - Log invalid variables with error messages
   - Exit with error code 1
4. If validation passes:
   - Return typed environment object
   - Continue with service startup

### Validation Files
- **API:** `apps/api/src/common/validation/env.validation.ts`
- **Worker:** `apps/worker/src/env.validation.ts`
- **Socket:** `apps/socket/src/env.validation.ts`

---

## Environment Files

### .env.example
Template file showing all required environment variables with example values. Copy this file to create your local `.env` file.

### .env
Local development environment file. Never commit this file to version control.

### .env.production
Production environment file. Never commit this file to version control. Use secret management in production.

---

## Security Best Practices

### Secrets Management
- **Never commit** `.env` files to version control
- **Use different secrets** for each environment
- **Rotate secrets** regularly
- **Use strong random strings** for secrets (minimum 32 characters)
- **Use secret management** in production (e.g., AWS Secrets Manager, HashiCorp Vault)

### Sensitive Variables
These variables contain sensitive information and must be protected:
- `DATABASE_URL` - Contains database credentials
- `REDIS_URL` - Contains Redis credentials
- `JWT_SECRET` - Used for token signing
- `MINIO_ROOT_PASSWORD` - MinIO credentials

### Development vs Production
- **Development:** Use example values from `.env.example`
- **Production:** Use strong, randomly generated secrets
- **Test:** Use test-specific values (can be less secure)

---

## Docker Compose Configuration

### Environment Variables in Docker Compose
Docker Compose uses environment variables from `.env` file and `docker-compose.yml`:

```yaml
services:
  api:
    environment:
      - NODE_ENV=${NODE_ENV}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
```

### Overriding Variables
Variables in `.env` file can be overridden by:
- Command line: `API_PORT=4000 pnpm dev`
- Shell environment: `export API_PORT=4000`
- Docker Compose: `docker-compose run -e API_PORT=4000 api`

---

## Service-Specific Configuration

### API Service
```typescript
// apps/api/src/common/validation/env.validation.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  API_PORT: z.string().regex(/^\d+$/).transform(Number),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string(),
  WEB_ORIGIN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']),
});
```

### Worker Service
```typescript
// apps/worker/src/env.validation.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  REDIS_URL: z.string().url(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']),
});
```

### Socket Service
```typescript
// apps/socket/src/env.validation.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  SOCKET_PORT: z.string().regex(/^\d+$/).transform(Number),
  REDIS_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']),
});
```

---

## Troubleshooting

### Validation Fails at Startup
1. Check `.env` file exists
2. Check required variables are set
3. Check variable formats are correct
4. Check for typos in variable names
5. Check for extra spaces in values

### Service Won't Start
1. Check environment validation passed
2. Check port is not already in use
3. Check database connection string is correct
4. Check Redis connection string is correct
5. Check logs for specific error messages

### CORS Errors
1. Check `WEB_ORIGIN` is set correctly
2. Check frontend URL matches `WEB_ORIGIN`
3. Check CORS middleware is configured
4. Check for protocol mismatch (http vs https)

---

## Resources

- [Zod Documentation](https://zod.dev/)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
