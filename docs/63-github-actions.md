# 63 — GitHub Actions

**Document Control**

| Property | Value |
|----------|-------|
| Title | GitHub Actions |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the GitHub Actions workflows for the RDCS In-House Dialer Platform. GitHub Actions automates CI/CD, testing, security scanning, and deployment.

## 2. Workflow Inventory

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI | `ci.yml` | Push/PR to main/develop | Lint, test, build, security scan |
| Build Images | `build-images.yml` | Push to main, tags | Build and push Docker images |
| Deploy Staging | `deploy-staging.yml` | CI success on main | Auto-deploy to staging |
| Deploy Production | `deploy-production.yml` | Manual | Deploy to production |
| Nightly Tests | `nightly-tests.yml` | Scheduled | E2E, performance, security scans |
| Release | `release.yml` | Tag push | Generate release notes, artifacts |
| Dependency Update | `dependency-update.yml` | Scheduled | Check for dependency updates |
| Cleanup | `cleanup.yml` | Scheduled | Cleanup old images, logs |

## 3. CI Workflow (`ci.yml`)

See `23-ci-cd-pipeline.md` for full workflow. Summary of jobs:
- Lint and format check.
- Unit tests with coverage.
- Build all applications.
- Integration tests with Testcontainers.
- Security scans (dependency audit, container scan, SAST).
- E2E tests with Playwright.

## 4. Build Images Workflow (`build-images.yml`)

- Builds images for api, web, socket, worker, nginx.
- Pushes to GitHub Container Registry (GHCR).
- Tags: `sha`, `branch`, `semver`, `latest`.
- Scans images with Trivy.
- Fails on critical/high vulnerabilities.

## 5. Deploy Staging Workflow (`deploy-staging.yml`)

- Triggered after successful image build on main.
- Connects to staging server via SSH.
- Pulls latest images.
- Runs database migrations.
- Restarts services with rolling update.
- Runs smoke tests.
- Notifies team on Slack.

## 6. Deploy Production Workflow (`deploy-production.yml`)

- Triggered manually with version input.
- Requires environment approval.
- Performs blue/green deployment.
- Runs health checks and smoke tests.
- Switches traffic and monitors.
- Rolls back on failure.
- Records deployment event in monitoring and audit.

## 7. Nightly Tests Workflow (`nightly-tests.yml`)

- Runs on schedule (e.g., 2 AM UTC).
- Executes full E2E suite.
- Runs performance tests with k6.
- Runs security scans.
- Generates and publishes reports.
- Alerts on failures.

## 8. Release Workflow (`release.yml`)

- Triggered on semantic version tag push (e.g., `v1.2.3`).
- Builds release artifacts.
- Generates release notes from commits and PRs.
- Creates GitHub release.
- Attaches OpenAPI spec and deployment notes.

## 9. Secrets and Variables

GitHub repository secrets:

| Secret | Purpose |
|--------|---------|
| `STAGING_HOST` | Staging server IP/hostname |
| `STAGING_USER` | Staging SSH user |
| `STAGING_SSH_KEY` | Staging SSH private key |
| `PROD_HOST` | Production server IP/hostname |
| `PROD_USER` | Production SSH user |
| `PROD_SSH_KEY` | Production SSH private key |
| `REGISTRY_TOKEN` | GHCR token |
| `SENTRY_AUTH_TOKEN` | Sentry release token |
| `SLACK_WEBHOOK` | Slack notifications |
| `SNYK_TOKEN` | Snyk scanning (optional) |

## 10. Environment Protection

- Production deployment requires manual approval via GitHub environments.
- Approvers: engineering lead, SRE, or designated release manager.
- Deployment windows can be enforced via branch protection or workflow rules.

## 11. Workflow Best Practices

- Use reusable workflows for common steps.
- Pin action versions to SHA for security.
- Limit workflow permissions (least privilege).
- Use OIDC for cloud provider authentication where possible.
- Cache dependencies and Docker layers for speed.
- Validate inputs and outputs.
- Fail fast on critical issues.

## 12. Notifications

- Slack notifications for build/deploy status.
- Email on production deployment failure.
- PagerDuty on critical CI/CD failures affecting production readiness.

## 13. Monitoring CI/CD Health

- Track workflow duration and success rates.
- Track flaky tests and retry rates.
- Monitor security scan findings over time.
- Review deployment frequency and lead time.

## 14. Example Workflow Trigger

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      version:
        description: 'Deployment version'
        required: true
```

## 15. Future Enhancements

- Matrix builds for multiple environments.
- Self-hosted runners for performance/security tests.
- Integration with GitHub Advanced Security.
- GitOps workflows with ArgoCD/Flux.
- Automated changelog and release management.
