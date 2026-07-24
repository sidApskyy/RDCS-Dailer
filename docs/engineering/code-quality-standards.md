# Code Quality Standards

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform code

---

## Overview

This document defines the coding standards for the RDCS In-House Dialer Platform. All developers must follow these standards to ensure code consistency, maintainability, and quality.

---

## Tooling

### Prettier
**Configuration:** `.prettierrc.json`
**Purpose:** Code formatting
**Command:** `pnpm format` (format), `pnpm format:check` (verify)

**Rules:**
- Semi-colons: Required
- Trailing commas: ES5
- Quotes: Single
- Print width: 100 characters
- Tab width: 2 spaces
- Tabs: Use spaces (false)
- Arrow parens: Always
- End of line: LF
- Bracket spacing: Enabled
- Bracket same line: Disabled
- Quote props: As-needed

### ESLint
**Configuration:** `packages/eslint-config/index.js`
**Purpose:** Code linting and quality checks
**Command:** `pnpm lint`

**Enabled Rules:**

#### TypeScript Rules
- `@typescript-eslint/no-unused-vars`: Error (prefix with `_` to ignore)
- `@typescript-eslint/no-explicit-any`: Warn (avoid when possible)
- `@typescript-eslint/explicit-function-return-type`: Off (inferred is preferred)
- `@typescript-eslint/explicit-module-boundary-types`: Off (inferred is preferred)
- `@typescript-eslint/no-non-null-assertion`: Warn (use with caution)

#### General Rules
- `no-console`: Warn (allow warn, error, info)
- `prefer-const`: Error
- `no-var`: Error

#### Import Rules
- `import/order`: Error (enforces import grouping and alphabetical order)
  - Groups: builtin, external, internal, parent, sibling, index
  - Newlines between groups: Always
  - Alphabetical: Ascending, case-insensitive
- `import/no-unresolved`: Error
- `import/no-cycle`: Warn

---

## TypeScript Standards

### Strict Mode
TypeScript strict mode is enabled in all projects via `packages/tsconfig/base.json`:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noImplicitThis": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

### Explicit Any Policy
- **Avoid `any`**: Use `unknown` when type is truly unknown
- **Warn on `any`**: ESLint will warn when `any` is used
- **Justification**: Add comment explaining why `any` is necessary if used
- **Alternatives**: Use generics, type guards, or union types before resorting to `any`

### Type vs Interface
- **Use `interface`** for object shapes that may be extended
- **Use `type`** for unions, intersections, primitives, and utility types
- **Consistency**: Be consistent within a module

---

## Naming Conventions

### Files
- **TypeScript files**: `kebab-case.ts` (e.g., `user-service.ts`)
- **Test files**: `*.spec.ts` or `*.test.ts`
- **Component files (React)**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Configuration files**: `kebab-case.config.js/ts` (e.g., `jest.config.js`)

### Folders
- **Source folders**: `kebab-case` (e.g., `user-management/`)
- **Package folders**: `kebab-case` (e.g., `@rdcs/database`)
- **Test folders**: `__tests__/` or `test/`

### Functions
- **Regular functions**: `camelCase` (e.g., `getUserById`)
- **Async functions**: `camelCase` (e.g., `fetchUserData`)
- **Event handlers**: `handle` prefix (e.g., `handleSubmit`, `handleClick`)
- **Boolean returns**: `is/has/can/should` prefix (e.g., `isValid`, `hasPermission`)

### Classes
- **Classes**: `PascalCase` (e.g., `UserService`, `PrismaService`)
- **Abstract classes**: `PascalCase` with `Abstract` prefix if needed (e.g., `AbstractRepository`)

### Interfaces
- **Interfaces**: `PascalCase` with `I` prefix (e.g., `IUser`, `IRepository`)
- **Note**: Some teams prefer no `I` prefix; be consistent within the codebase

### Types
- **Type aliases**: `PascalCase` (e.g., `User`, `UserRole`)
- **Generic types**: `T` prefix for single type, descriptive names for multiple (e.g., `T`, `TKey`, `TValue`)

### DTOs
- **DTOs**: `PascalCase` with `Dto` suffix (e.g., `CreateUserDto`, `UpdateUserDto`)
- **Request DTOs**: Action + noun + `Dto` (e.g., `CreateUserDto`, `UpdateCampaignDto`)
- **Response DTOs**: Noun + `ResponseDto` (e.g., `UserResponseDto`)

### Constants
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `API_PORT`, `MAX_RETRY_COUNT`)
- **Enum values**: `PascalCase` or `SCREAMING_SNAKE_CASE` (be consistent)

### Environment Variables
- **Environment variables**: `SCREAMING_SNAKE_CASE` (e.g., `DATABASE_URL`, `JWT_SECRET`)
- **Grouping**: Prefix by service (e.g., `REDIS_URL`, `MINIO_ENDPOINT`)

### Test Naming
- **Test files**: `*.spec.ts` or `*.test.ts`
- **Test suites**: `describe('FeatureName', () => {})`
- **Test cases**: `it('should do something when condition', () => {})`
- **Test descriptions**: Should read as a sentence

---

## Import Ordering

Imports must follow this order with blank lines between groups:

1. **Node.js built-in modules** (e.g., `import { createServer } from 'http'`)
2. **External packages** (e.g., `import IORedis from 'ioredis'`)
3. **Internal packages** (e.g., `import { PrismaService } from '@rdcs/database'`)
4. **Parent imports** (e.g., `import { UserService } from '../services'`)
5. **Sibling imports** (e.g., `import { UserController } from './user.controller'`)
6. **Index imports** (e.g., `import * as handlers from './handlers'`)

Within each group, imports must be alphabetically sorted (case-insensitive).

**Example:**
```typescript
import { createServer } from 'http';

import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { Server } from 'socket.io';

import { PrismaService } from '@rdcs/database';

import { LoggerService } from '../services/logger.service';

import { UserController } from './user.controller';
import { UserService } from './user.service';
```

---

## Code Organization

### File Structure
- **Imports**: At the top, ordered as specified above
- **Constants**: After imports, before class/function definitions
- **Type definitions**: After constants, before class/function definitions
- **Class/function definitions**: Main implementation
- **Exports**: At the bottom

### Module Organization
- **Barrel files**: Use `index.ts` to export from a module
- **Public API**: Export only what should be publicly accessible
- **Internal implementation**: Keep private, don't export

---

## Best Practices

### Error Handling
- **Use try-catch**: For async operations that may fail
- **Throw meaningful errors**: Include context in error messages
- **Don't swallow errors**: Always handle or re-throw
- **Use custom error classes**: For domain-specific errors

### Async/Await
- **Prefer async/await** over callbacks
- **Handle promises**: Always handle rejections
- **Avoid promise chains**: Use async/await for readability

### Null/Undefined Handling
- **Use optional chaining**: `obj?.prop?.nested`
- **Use nullish coalescing**: `value ?? defaultValue`
- **Check for null/undefined**: Before accessing properties
- **Use strict equality**: `===` and `!==` for null/undefined checks

### Comments
- **Document complex logic**: Add comments for non-obvious code
- **Keep comments current**: Update comments when code changes
- **Avoid obvious comments**: Don't comment what the code already says
- **Use JSDoc**: For public APIs and complex functions

### Code Duplication
- **DRY principle**: Don't Repeat Yourself
- **Extract functions**: For repeated logic
- **Create utilities**: For common operations
- **Use composition**: Over inheritance when appropriate

---

## Security

### Sensitive Data
- **Never log secrets**: Don't log passwords, tokens, API keys
- **Never commit secrets**: Use environment variables
- **Validate input**: Always validate user input
- **Sanitize output**: Escape user-generated content

### Dependencies
- **Audit dependencies**: Regularly check for vulnerabilities
- **Keep updated**: Update dependencies regularly
- **Review changes**: Review dependency updates before merging

---

## Performance

### Database
- **Use indexes**: For frequently queried fields
- **Avoid N+1 queries**: Use includes/joins appropriately
- **Limit results**: Use pagination for large datasets
- **Use transactions**: For multi-step operations

### API
- **Use caching**: For expensive operations
- **Rate limit**: Protect against abuse
- **Validate early**: Fail fast on invalid input
- **Use compression**: For large responses

---

## Testing

### Unit Tests
- **Test behavior**: Not implementation details
- **Use descriptive names**: Test names should describe what is tested
- **Arrange-Act-Assert**: Structure tests clearly
- **Mock dependencies**: Isolate the unit under test

### Integration Tests
- **Test interactions**: Between components
- **Use test database**: Don't use production data
- **Clean up**: Reset state between tests
- **Test error cases**: Not just happy paths

---

## Documentation

### Code Documentation
- **JSDoc comments**: For public APIs
- **README files**: For each package/module
- **Inline comments**: For complex logic
- **Update docs**: When code changes

### API Documentation
- **OpenAPI/Swagger**: For REST APIs
- **Keep updated**: Sync with code changes
- **Include examples**: Show request/response formats
- **Document errors**: List possible error responses

---

## Enforcement

### Pre-commit Hooks
- **ESLint**: Runs on staged files
- **Prettier**: Formats staged files
- **TypeScript**: Checks for type errors (if configured)

### CI/CD
- **Lint check**: Must pass before merge
- **Type check**: Must pass before merge
- **Tests**: Must pass before merge
- **Build**: Must succeed before merge

---

## Violations

### Handling Violations
- **Fix immediately**: Don't commit with violations
- **Ask for clarification**: If a rule is unclear
- **Propose changes**: If a rule doesn't make sense
- **Be consistent**: Follow the standard even if you disagree

### Updating Standards
- **Discuss with team**: Before changing standards
- **Update documentation**: When standards change
- **Migrate gradually**: Allow time for adoption
- **Communicate changes**: Inform all developers

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [NestJS Style Guide](https://docs.nestjs.com/faq/style-guide)
- [React Documentation](https://react.dev/)
