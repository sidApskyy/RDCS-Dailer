# 61 — Testing Strategy

**Document Control**

| Property | Value |
|----------|-------|
| Title | Testing Strategy |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the testing strategy for the RDCS In-House Dialer Platform. A comprehensive testing approach ensures quality, reliability, security, and performance at scale.

## 2. Testing Pyramid

```
        ┌─────────┐
        │   E2E   │  Playwright (critical paths)
        ├─────────┤
        │Integration│  API, DB, queues, telephony adapter
        ├─────────┤
        │   Unit   │  Domain logic, services, utilities
        └─────────┘
```

## 3. Unit Testing

### 3.1 Scope

- Domain entities and value objects.
- Domain services and application handlers.
- Utility functions, validators, mappers.
- Permission evaluation logic.
- Dialer pacing and compliance algorithms.

### 3.2 Tools

- Backend: Jest.
- Frontend: Vitest + React Testing Library.
- Mocking: jest-mock, MSW for API mocking in frontend.

### 3.3 Targets

- Minimum 80% code coverage for backend domain/application layers.
- Minimum 70% coverage for frontend business logic.
- Critical paths covered with 100% (e.g., compliance checks, permission evaluation).

### 3.4 Example

```typescript
describe('Campaign activation', () => {
  it('should fail if no caller IDs are configured', () => {
    const campaign = Campaign.create({ ...noCallerIds });
    const result = campaign.activate();
    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('Campaign must have at least one caller ID');
  });
});
```

## 4. Integration Testing

### 4.1 Scope

- API controllers and repositories.
- Database queries with Prisma and Testcontainers.
- Redis/BullMQ interactions.
- Event publishing and consumption.
- Telephony adapter with mock adapter.
- External service integrations (webhooks, email, SMS).

### 4.2 Tools

- Backend: Jest + Supertest + Testcontainers (PostgreSQL, Redis, MinIO).
- Frontend: Vitest + MSW.
- Telephony: mock adapter + local Asterisk container for optional tests.

### 4.3 Targets

- 70% integration coverage for critical paths.
- All major modules have at least one integration test.

## 5. E2E Testing

### 5.1 Scope

- Critical user journeys:
  - Login and MFA.
  - Create and activate campaign.
  - Import leads and validate.
  - Agent makes a call and sets disposition.
  - Supervisor monitors and coaches.
  - Compliance report generation.
  - Recording playback and QA scoring.
- Cross-browser testing (Chrome, Firefox, Edge).

### 5.2 Tools

- Playwright.
- Test data seeded in staging environment.
- API helpers for setup/teardown.

### 5.3 Targets

- E2E tests run in CI on every release candidate.
- Smoke tests run after every deployment.
- Critical path coverage 100%.

## 6. Performance Testing

### 6.1 Scope

- API load and latency under expected and peak load.
- Dialer throughput and decision latency.
- WebSocket event delivery under high agent count.
- CSV import throughput.
- Recording upload throughput.
- Database query performance with production-like data volumes.

### 6.2 Tools

- k6 or Artillery for API/WebSocket load testing.
- JMeter for complex scenarios.
- Custom dialer load simulator.

### 6.3 Targets

- p95 API latency < 100ms under target load.
- Dialer decision latency < 200ms.
- WebSocket event delivery < 500ms.
- 100K CSV rows imported in < 10 minutes.
- 5,000 concurrent agents simulated.

## 7. Security Testing

### 7.1 Scope

- Authentication bypass attempts.
- Authorization escalation (horizontal/vertical).
- Injection attacks (SQL, NoSQL, command, XSS).
- CSRF and session fixation.
- Rate limit bypass.
- Secret leakage in logs/responses.
- Telephony fraud patterns.

### 7.2 Tools

- SAST: CodeQL, SonarQube.
- DAST: OWASP ZAP, Burp Suite (manual/scheduled).
- Dependency scanning: npm audit, Trivy, Snyk.
- Penetration testing: annual third-party.

## 8. Telephony Testing

- Mock adapter unit tests.
- Local Asterisk container integration tests.
- SIP trunk connectivity tests with carriers.
- AMD accuracy tests with recorded samples.
- Call recording capture and upload tests.
- Failover and carrier redundancy tests.

## 9. Compliance Testing

- DNC scrubbing accuracy.
- Timezone window enforcement.
- Abandon rate guard behavior.
- Recording consent handling.
- TCPA safe harbor thresholds.
- Audit log completeness and immutability.

## 10. Test Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| Local | Developer testing | Seeded, synthetic |
| CI | Automated test runs | Ephemeral, seeded |
| Staging | Pre-production validation | Anonymized production-like |
| Production | Smoke tests, monitoring | Real (read-only) |

## 11. Test Data Management

- Seed scripts for development and CI.
- Anonymized production snapshots for staging (if available).
- Synthetic leads, calls, recordings for load tests.
- DNC and compliance test datasets.

## 12. CI/CD Testing Pipeline

1. Lint and format checks.
2. Unit tests.
3. Build.
4. Integration tests with Testcontainers.
5. Security scans.
6. E2E tests in staging.
7. Performance tests on staging (nightly or release).
8. Manual QA for major features.

## 13. Regression Testing

- Regression suite runs before every release.
- Automated regression for API and E2E.
- Manual regression for UI/UX changes.
- Telephony regression for adapter changes.

## 14. Test Automation Ownership

- Developers write unit and integration tests for their code.
- QA team owns E2E and regression suites.
- DevOps owns performance and security test automation.
- Architecture team reviews test coverage for critical paths.

## 15. Metrics & Reporting

- Test coverage tracked in CI and reported via Codecov/SonarQube.
- Test pass/fail trends tracked.
- Flaky test identification and remediation.
- Defect escape rate measured.
- Performance benchmark history maintained.

## 16. Testing Standards

- Tests follow Arrange-Act-Assert pattern.
- Mock external dependencies; avoid real network calls in unit tests.
- Use factories/fixtures for test data.
- Avoid brittle selectors in E2E tests (use data-testid).
- Cleanup test data after integration/E2E tests.
- Parallelize tests where possible.
