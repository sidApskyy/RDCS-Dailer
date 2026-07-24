# Seed Data Documentation

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** RDCS Dialer Platform

---

## Overview

This document describes the deterministic seed data used for development and testing in the RDCS In-House Dialer Platform. Seed data is designed to be reproducible and consistent across environments.

---

## Seed Data Structure

### Tenant

**Slug:** `rdcs-development`

**Name:** `RDCS Development`

**Purpose:** Development tenant for all seed data

---

### Organization

**Slug:** `rdcs-platform`

**Name:** `RDCS Platform`

**Type:** `organization`

**Purpose:** Platform organization for development

---

### Roles

#### Platform Administrator

**Name:** `Platform Administrator`

**Description:** Development administrator role

**Is System:** `true`

**Permissions:** All permissions (full access)

**Purpose:** Administrative access for development

#### Agent

**Name:** `Agent`

**Description:** Agent role

**Is System:** `true`

**Permissions:** Calls and contacts read/create/update

**Purpose:** Agent access for development

#### Supervisor

**Name:** `Supervisor`

**Description:** Supervisor role

**Is System:** `true`

**Permissions:** Calls and contacts read/create/update

**Purpose:** Supervisor access for development

---

### Permissions

#### System Permissions

- `system:read:tenant` - Read system information

#### User Permissions

- `users:read:tenant` - Read users
- `users:create:tenant` - Create users
- `users:update:tenant` - Update users

#### Call Permissions

- `calls:read:tenant` - Read calls
- `calls:create:tenant` - Create calls
- `calls:update:tenant` - Update calls

#### Contact Permissions

- `contacts:read:tenant` - Read contacts
- `contacts:create:tenant` - Create contacts
- `contacts:update:tenant` - Update contacts

#### Campaign Permissions

- `campaigns:read:tenant` - Read campaigns
- `campaigns:create:tenant` - Create campaigns
- `campaigns:update:tenant` - Update campaigns

---

### Users

#### Administrator

**Email:** `admin@rdcs.local`

**Password:** `password` (hash: `$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC6u8P4lY9Jr8h1l6c7u`)

**First Name:** `RDCS`

**Last Name:** `Administrator`

**Status:** `active`

**Role:** Platform Administrator

**Purpose:** Administrative user for development

#### Agent

**Email:** `agent@rdcs.local`

**Password:** `password` (hash: `$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC6u8P4lY9Jr8h1l6c7u`)

**First Name:** `Test`

**Last Name:** `Agent`

**Status:** `active`

**Role:** Agent

**Purpose:** Agent user for development

#### Supervisor

**Email:** `supervisor@rdcs.local`

**Password:** `password` (hash: `$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC6u8P4lY9Jr8h1l6c7u`)

**First Name:** `Test`

**Last Name:** `Supervisor`

**Status:** `active`

**Role:** Supervisor

**Purpose:** Supervisor user for development

---

### Contact

**Phone Number:** `+1234567890`

**First Name:** `John`

**Last Name:** `Doe`

**Email:** `john.doe@example.com`

**Status:** `active`

**Purpose:** Test contact for development

---

### Campaign

**Slug:** `test-campaign`

**Name:** `Test Campaign`

**Description:** Test campaign for development

**Status:** `active`

**Purpose:** Test campaign for development

---

### Call

**ID:** `clm123abc`

**Phone Number:** `+1234567890`

**Status:** `completed`

**Direction:** `outbound`

**Duration:** `120` seconds

**Started At:** `2025-01-15T10:00:00Z`

**Ended At:** `2025-01-15T10:02:00Z`

**Purpose:** Test call for development

---

## Running Seed Data

### Development

```bash
# Run seed for development
pnpm db:seed
```

### Test

```bash
# Run seed for test environment
NODE_ENV=test pnpm db:seed
```

### Docker Compose

```bash
# Run seed with Docker Compose
docker compose exec database pnpm db:seed
```

---

## Seed Data File

**Location:** `packages/database/prisma/seed.ts`

**Implementation:** Uses Prisma `upsert` for idempotent seeding

**Determinism:** All data uses fixed IDs and values for reproducibility

---

## Best Practices

### Determinism

- Use fixed IDs for all entities
- Use fixed values for all fields
- Use fixed timestamps
- Avoid random data generation

### Idempotency

- Use `upsert` instead of `create`
- Check for existing data before creating
- Update existing data instead of failing
- Log what was created vs updated

### Security

- Use weak passwords only for development
- Never use seed passwords in production
- Document password hashes
- Rotate passwords regularly

### Maintenance

- Keep seed data up to date
- Remove obsolete seed data
- Add new seed data as needed
- Document changes in this file

---

## Troubleshooting

### Seed Fails

1. Check database connection
2. Check database schema
3. Check for foreign key constraints
4. Check for unique constraint violations

### Data Not Seeded

1. Check seed file exists
2. Check seed script is configured
3. Check for errors in seed output
4. Check database permissions

### Duplicate Data

1. Check `upsert` conditions
2. Check unique constraints
3. Check for existing data
4. Check seed script logic

---

## Resources

- [Prisma Seed](https://www.prisma.io/docs/guides/database/seed-database)
- [Prisma Upsert](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#upsert)
