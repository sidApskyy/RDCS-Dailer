# 23 — CI/CD Pipeline

**Document Control**

| Property | Value |
|----------|-------|
| Title | CI/CD Pipeline |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the CI/CD pipeline for the RDCS In-House Dialer Platform. The pipeline is implemented with GitHub Actions and Docker, supporting continuous integration, testing, security scanning, and continuous deployment.

## 2. Pipeline Goals

- Fast, reliable feedback on code changes.
- Automated testing at unit, integration, and E2E levels.
- Security scanning for dependencies and containers.
- Immutable, versioned Docker images.
- Automated deployment to staging and production.
- Zero-downtime production deployments.

## 3. Pipeline Stages

```
Commit
  │
  ├─> Lint & Format
  ├─> Unit Tests
  ├─> Build
  ├─> Integration Tests (with Testcontainers)
  ├─> Security Scan (SAST, dependency, container)
  ├─> E2E Tests (Playwright)
  │
  ├─> Build & Push Docker Images
  │
  ├─> Deploy to Staging (auto on main branch)
  │     ├─> Smoke Tests
  │     └─> Approval Gate
  │
  └─> Deploy to Production (manual approval)
        ├─> Blue/Green or Rolling Update
        ├─> Health Checks
        ├─> Smoke Tests
        └─> Rollback on Failure
```

## 4. GitHub Actions Workflows

### 4.1 `ci.yml` — Continuous Integration

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: [lint, unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build

  integration-tests:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:integration

  security-scan:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [integration-tests, security-scan]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install
      - run: docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d
      - run: npm run test:e2e
      - run: docker compose down
```

### 4.2 `build-images.yml` — Build & Push Images

```yaml
name: Build Images

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api, web, socket, worker, nginx]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/rdcs/${{ matrix.service }}
          tags: |
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}
      - uses: docker/build-push-action@v5
        with:
          context: ./apps/${{ matrix.service }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/rdcs/${{ matrix.service }}:${{ github.sha }}
          severity: 'CRITICAL,HIGH'
```

### 4.3 `deploy-staging.yml` — Deploy to Staging

```yaml
name: Deploy Staging

on:
  workflow_run:
    workflows: ["Build Images"]
    branches: [main]
    types: [completed]

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/rdcs
            docker compose -f docker-compose.base.yml -f docker-compose.staging.yml pull
            docker compose -f docker-compose.base.yml -f docker-compose.staging.yml up -d
            docker compose exec api npx prisma migrate deploy
            docker compose exec api npx prisma db seed
            docker compose restart nginx
      - name: Smoke Tests
        run: |
          curl -f https://staging.rdcs.example.com/health
          curl -f https://staging.rdcs.example.com/api/v1/health
```

### 4.4 `deploy-production.yml` — Deploy to Production

```yaml
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Image version tag'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Blue/Green Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/rdcs
            export VERSION=${{ github.event.inputs.version }}
            # Determine inactive color
            if [ "$(docker compose -f docker-compose.prod.yml ps -q api_blue)" ]; then
              ACTIVE=blue; INACTIVE=green
            else
              ACTIVE=green; INACTIVE=blue
            fi
            # Deploy to inactive
            API_VERSION=$VERSION WEB_VERSION=$VERSION SOCKET_VERSION=$VERSION WORKER_VERSION=$VERSION NGINX_VERSION=$VERSION docker compose -f docker-compose.prod.yml up -d api_$INACTIVE web_$INACTIVE socket_$INACTIVE worker_$INACTIVE
            # Health check
            sleep 30
            curl -f http://localhost:4000_$INACTIVE/health || exit 1
            # Switch traffic
            ./scripts/switch-traffic.sh $INACTIVE
            # Stop old color
            docker compose -f docker-compose.prod.yml stop api_$ACTIVE web_$ACTIVE socket_$ACTIVE worker_$ACTIVE
      - name: Smoke Tests
        run: |
          curl -f https://app.rdcs.example.com/health
          curl -f https://api.rdcs.example.com/api/v1/health
```

## 5. Environments

| Environment | Purpose | Deployment Trigger |
|-------------|---------|---------------------|
| Local | Developer workstations | Manual `docker compose` |
| CI | Automated tests | Every PR/push |
| Staging | Pre-production validation | Auto on main branch success |
| Production | Live customer traffic | Manual approval with version tag |
| DR | Disaster recovery | Runbook-driven failover |

## 6. Branching Strategy

- **main**: Production-ready code; deploys to staging automatically, production manually.
- **develop**: Integration branch; deploys to dev environment.
- **feature/***: Short-lived feature branches; merged via PR.
- **hotfix/***: Critical production fixes; merged to main and develop.
- **release/***: Release preparation branches.

## 7. Image Tagging

- `sha-<commit-sha>`: Unique per build.
- `<branch>-<sha>`: Branch-specific builds.
- `v1.2.3`: Semantic version releases.
- `latest`: Only for default branch; not used in production deployments.

## 8. Security in CI/CD

- Dependency audit with `npm audit`.
- Container scanning with Trivy.
- SAST scanning with CodeQL or SonarQube.
- Secrets scanning with GitHub secret scanning or TruffleHog.
- No secrets in repository; use GitHub secrets and Docker secrets.
- Signed commits and signed container images (future).

## 9. Rollback Strategy

- Blue/green deployment allows instant rollback by switching traffic back.
- Previous Docker image tags retained for rollback.
- Database migrations are backward-compatible; destructive migrations performed in separate release.
- Automated rollback if health checks fail after deployment.

## 10. Monitoring CI/CD Health

- GitHub Actions notifications to Slack/Teams on failure.
- Deployment events sent to monitoring and audit logs.
- Sentry release tracking for error correlation.

## 11. Infrastructure Deployment

- Server provisioning via Ansible or cloud-init.
- Docker and Docker Compose installation automated.
- Initial secrets and certificates deployed securely.
- Monitoring stack deployed alongside application.

## 12. Future Enhancements

- Kubernetes deployment via Helm and ArgoCD.
- GitOps workflow with Flux/ArgoCD.
- Canary deployments with progressive traffic shifting.
- Automated chaos testing in staging.
- Signed commits and artifact signing.
