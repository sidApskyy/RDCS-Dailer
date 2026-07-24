# 67 — Coding Standards

**Document Control**

| Property | Value |
|----------|-------|
| Title | Coding Standards |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the coding standards for the RDCS In-House Dialer Platform. All engineers must follow these standards to ensure consistency, maintainability, and quality.

## 2. Language & Framework Standards

- Backend: TypeScript with NestJS.
- Frontend: TypeScript with Next.js and React.
- Database: PostgreSQL via Prisma.
- Styling: TailwindCSS with Shadcn UI components.
- Testing: Jest/Vitest, React Testing Library, Playwright.

## 3. General Principles

- **KISS**: Keep it simple and focused.
- **DRY**: Don't repeat yourself; extract shared logic.
- **SOLID**: Follow SOLID principles, especially single responsibility and dependency inversion.
- **Clean Architecture**: Domain logic independent of frameworks.
- **Type Safety**: Use strict TypeScript; avoid `any`.
- **Immutability**: Prefer immutable data structures and pure functions.
- **Readability**: Code is read more than written; optimize for clarity.

## 4. Naming Conventions

### 4.1 Files

- Backend: `kebab-case.ts` for files; `feature-name.command.ts` for CQRS files.
- Frontend: `PascalCase.tsx` for components; `camelCase.ts` for utilities.
- Tests: `*.spec.ts` for unit; `*.test.ts` for integration; `*.e2e.ts` for E2E.

### 4.2 Variables & Functions

- Variables: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` for true constants.
- Functions: `camelCase`, descriptive verbs.
- Classes: `PascalCase`.
- Interfaces: `PascalCase` with no `I` prefix.
- Enums: `PascalCase`, members `PascalCase` or `SCREAMING_SNAKE_CASE`.
- Types: `PascalCase`.

### 4.3 Database

- Tables: plural `snake_case`.
- Columns: `snake_case`.
- Prisma models: singular `PascalCase`.
- Prisma fields: `camelCase`.

### 4.4 API

- Endpoints: plural `kebab-case`, e.g., `/api/v1/campaigns`.
- DTOs: `PascalCaseDto`, e.g., `CreateCampaignDto`.
- Response types: `PascalCaseResponse`, e.g., `CampaignResponse`.

## 5. Code Formatting

- Use Prettier for formatting.
- 2 spaces indentation.
- 100 character line length (soft limit).
- Single quotes for strings.
- Trailing commas in multi-line structures.
- Semicolons required.

## 6. Linting

- ESLint with strict TypeScript rules.
- No `any` except with explicit justification and comment.
- No unused variables or imports.
- No console logs in production code (use logger).
- No explicit `null` where `undefined` is more appropriate.

## 7. Comments & Documentation

- Avoid unnecessary comments; code should be self-explanatory.
- Use JSDoc for public functions and complex logic.
- Document architectural decisions in ADRs.
- Keep API docs updated via Swagger decorators.
- Do not leave TODOs in committed code; track in issue tracker.

## 8. Error Handling

- Use typed errors and custom exception classes.
- Domain errors return `Result<T>` or throw domain exceptions.
- Catch errors at boundaries; do not swallow exceptions.
- Log errors with context and correlation ID.
- Never expose stack traces or internal details to clients.
- Use global exception filters for consistent HTTP responses.

## 9. Validation

- Validate all inputs at API boundary using DTOs + class-validator/Zod.
- Validate business invariants in domain layer.
- Use Prisma constraints for database-level validation.
- Sanitize user inputs to prevent injection and XSS.

## 10. Asynchronous Code

- Prefer `async/await` over raw promises.
- Handle promise rejections.
- Use `Promise.all` only when safe; prefer sequential execution for dependent operations.
- Add timeouts for external calls.

## 11. Dependency Management

- Pin dependency versions in `package.json`.
- Use exact versions for critical dependencies.
- Regularly update dependencies and review changelogs.
- Audit dependencies for vulnerabilities in CI.
- Avoid unnecessary dependencies.

## 12. Testing Standards

- Write tests alongside code (TDD encouraged).
- Use descriptive test names: `should ... when ...`.
- Mock external dependencies.
- Use factories for test data.
- Clean up after tests.
- Aim for high coverage on critical paths.

## 13. Security Standards

- No secrets in code.
- Validate and sanitize all inputs.
- Use parameterized queries (Prisma).
- Escape output in frontend (React does this by default).
- Enforce least privilege in code and infrastructure.
- Log security-relevant events.

## 14. Performance Standards

- Avoid N+1 queries; use Prisma include/select efficiently.
- Use Redis caching for frequently accessed data.
- Pagination for large lists.
- Lazy load heavy components in frontend.
- Optimize bundle size.

## 15. Git Standards

- Branch naming: `feature/`, `bugfix/`, `hotfix/`, `release/`.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Squash commits before merging feature branches.
- Require PR reviews before merging.
- Require CI checks to pass before merging.
- Keep PRs small and focused.

## 16. Review Checklist

- Code follows naming and formatting standards.
- Tests included and passing.
- No security issues introduced.
- No performance regressions.
- Documentation updated.
- DTOs and API contracts aligned.
- Error handling adequate.
- No secrets or hardcoded values.

## 17. Tooling

- Prettier for formatting.
- ESLint for linting.
- Husky for pre-commit hooks.
- lint-staged for staged file checks.
- Jest/Vitest for testing.
- Commitlint for commit message conventions.
