# 62 — Deployment Strategy

**Document Control**

| Property | Value |
|----------|-------|
| Title | Deployment Strategy |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the deployment strategy for the RDCS In-House Dialer Platform. The strategy ensures zero-downtime deployments, reliable rollbacks, and safe promotion across environments.

## 2. Deployment Principles

- Zero-downtime production deployments.
- Immutable, versioned container images.
- Environment parity (dev, staging, prod).
- Automated testing before deployment.
- Manual approval for production.
- Rollback capability within minutes.
- All deployments audited.

## 3. Environments

| Environment | Trigger | Purpose |
|-------------|---------|---------|
| Local | Manual | Developer testing |
| CI | Every push/PR | Automated validation |
| Staging | Auto on main branch success | Pre-production validation |
| Production | Manual approval | Live customer traffic |
| DR | Runbook-driven | Disaster recovery |

## 4. Deployment Methods

### 4.1 Blue/Green Deployment (Production)

- Two identical production environments: blue and green.
- One active, one idle.
- Deploy new version to idle environment.
- Run health checks and smoke tests.
- Switch traffic to new environment.
- Keep old environment briefly for instant rollback.

### 4.2 Rolling Updates (Staging/Workers)

- Containers updated one by one.
- Health checks ensure new containers are healthy before proceeding.
- Suitable for stateless API and worker services.

### 4.3 Database Migrations

- Migrations run before application deployment.
- Migrations must be backward-compatible with previous app version.
- Destructive migrations performed in separate release with coordination.
- Rollback plan includes backward migrations if needed.

## 5. Deployment Pipeline

```
Commit → CI Tests → Build Images → Push to Registry → Deploy Staging → Smoke Tests → Manual Approval → Deploy Production → Smoke Tests → Monitor
```

## 6. Image Promotion

- Images built once and promoted through environments.
- Tags: `commit-sha`, `branch`, `semver`.
- Production uses immutable semver tags only.
- No rebuilding for production deployments.

## 7. Configuration Management

- Environment-specific configuration in `.env` files or secret manager.
- No secrets in source code or image layers.
- Feature flags for gradual rollout (future).
- Configuration validated before deployment.

## 8. Pre-Deployment Checks

- All CI tests passing.
- Security scans clean.
- Database migrations reviewed and tested.
- Rollback plan documented.
- Change log and release notes prepared.
- Stakeholder notification sent.

## 9. Deployment Steps (Production)

1. Announce maintenance window (if any).
2. Verify current system health.
3. Run database migrations (if applicable).
4. Deploy new version to inactive environment.
5. Run health checks and smoke tests.
6. Switch traffic to new environment.
7. Monitor metrics and logs for 30 minutes.
8. Confirm success; decommission old environment.
9. Update deployment records and runbooks.
10. Communicate completion.

## 10. Rollback Strategy

- Blue/green: switch traffic back to previous environment.
- Rolling update: redeploy previous image tag.
- Database: backward-compatible migrations or restore from backup if critical.
- Automated rollback if health checks fail.
- Rollback decisions made by on-call engineer or SRE.

## 11. Deployment Monitoring

- Error rate, latency, throughput compared to baseline.
- Queue depth and worker health.
- Telephony adapter event flow.
- Agent login and call success rate.
- Database connection and replication health.
- Customer-facing health checks.

## 12. Deployment Windows

- Production deployments during low-traffic hours.
- Avoid deployments during critical business hours or campaign peaks.
- Coordinate with operations and compliance teams.
- Hotfixes follow expedited but controlled process.

## 13. Hotfix Process

1. Create hotfix branch from production tag.
2. Fix, test, and build image.
3. Deploy via expedited pipeline.
4. Verify and merge hotfix back to main/develop.
5. Post-incident review if needed.

## 14. Deployment Documentation

- Release notes for every production deployment.
- Deployment runbook maintained.
- Rollback runbook maintained.
- Environment configuration documented.
- Post-deployment checklist completed.

## 15. Future Enhancements

- Canary deployments with progressive traffic shifting.
- Feature flags for safe rollouts.
- Automated rollback based on anomaly detection.
- GitOps with ArgoCD/Flux.
- Kubernetes deployment with Helm charts.
