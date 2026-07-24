# 21 — Docker Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Docker Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the Docker architecture for the RDCS In-House Dialer Platform. Docker is used to containerize all application and supporting services, ensuring consistency across development, staging, and production.

## 2. Container Strategy

- All application services run as Docker containers.
- Images are built from minimal, secure base images (Node.js Alpine or Debian Slim).
- Multi-stage builds for production images to reduce size and attack surface.
- Container orchestration via Docker Compose for initial deployment; Kubernetes for future scale.
- Secrets and configuration injected via environment variables or Docker secrets.

## 3. Image Inventory

| Image | Base | Purpose | Exposed Ports |
|-------|------|---------|---------------|
| rdcs/web | node:20-alpine | Next.js frontend | 3000 |
| rdcs/api | node:20-alpine | NestJS backend | 4000 |
| rdcs/socket | node:20-alpine | Socket.IO gateway | 4001 |
| rdcs/worker | node:20-alpine | BullMQ workers | (none) |
| rdcs/nginx | nginx:alpine | Reverse proxy / load balancer | 80, 443 |
| rdcs/postgres | postgres:15 | Primary database | 5432 |
| rdcs/redis | redis:7-alpine | Cache, sessions, pub/sub, queues | 6379 |
| rdcs/minio | minio/minio | Object storage | 9000, 9001 |
| rdcs/grafana | grafana/grafana | Monitoring dashboards | 3000 |
| rdcs/prometheus | prom/prometheus | Metrics collection | 9090 |
| rdcs/loki | grafana/loki | Log aggregation | 3100 |
| rdcs/promtail | grafana/promtail | Log shipping | (none) |
| rdcs/vicidial | custom ubuntu | ViciDial manager | 80, 443, 3306 |
| rdcs/asterisk | custom ubuntu | Asterisk media server | 5060, 10000-20000 |

## 4. Multi-Stage Dockerfile Example (API)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate
EXPOSE 4000
USER node
CMD ["node", "dist/main.js"]
```

## 5. Docker Compose Structure

```
docker/
├── docker-compose.base.yml
├── docker-compose.dev.yml
├── docker-compose.staging.yml
├── docker-compose.prod.yml
├── docker-compose.telephony.yml
├── docker-compose.monitoring.yml
└── .env.example
```

### 5.1 Base Compose File

Defines common services: api, web, socket, worker, postgres, redis, minio.

### 5.2 Environment Overrides

- `docker-compose.dev.yml`: Hot reload, volume mounts, local debugging, seeded data.
- `docker-compose.staging.yml`: Production-like with test data and monitoring.
- `docker-compose.prod.yml`: Replicas, resource limits, secrets, health checks, no source mounts.
- `docker-compose.telephony.yml`: ViciDial and Asterisk services.
- `docker-compose.monitoring.yml`: Prometheus, Grafana, Loki, Promtail, Node Exporter.

## 6. Production Service Configuration

```yaml
services:
  api:
    image: rdcs/api:${API_VERSION}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
    secrets:
      - jwt_secret
      - db_password
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - app-network

  web:
    image: rdcs/web:${WEB_VERSION}
    deploy:
      replicas: 2
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
    networks:
      - app-network

  worker:
    image: rdcs/worker:${WORKER_VERSION}
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - REDIS_URL=${REDIS_URL}
    networks:
      - app-network

  nginx:
    image: rdcs/nginx:${NGINX_VERSION}
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - web
      - socket
    networks:
      - app-network
      - public-network

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - data-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - data-network

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER_FILE=/run/secrets/minio_root_user
      - MINIO_ROOT_PASSWORD_FILE=/run/secrets/minio_root_password
    volumes:
      - minio_data:/data
    networks:
      - data-network

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt
  minio_root_user:
    file: ./secrets/minio_root_user.txt
  minio_root_password:
    file: ./secrets/minio_root_password.txt

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  app-network:
    driver: bridge
  data-network:
    driver: bridge
    internal: true
  public-network:
    driver: bridge
```

## 7. Networking

- **app-network**: Application containers communicate here.
- **data-network**: Internal-only network for database, Redis, storage; no public access.
- **public-network**: Nginx and public-facing services only.
- **monitoring-network**: Monitoring stack isolated but reachable from management.
- **telephony-network**: ViciDial/Asterisk and application control traffic.

## 8. Secrets Management

- Docker secrets for production where Docker Swarm is available.
- For Compose-only, secrets are mounted as files from a protected directory.
- No secrets in image layers or environment variables in production.
- Environment variables reference secret files.

## 9. Health Checks

All services define health checks:
- API: `/health` endpoint.
- Web: `/api/health` or static page.
- PostgreSQL: `pg_isready`.
- Redis: `redis-cli ping`.
- MinIO: `mc ready local`.
- Nginx: `/health` endpoint.

## 10. Logging

- Containers log to stdout/stderr in JSON format.
- Promtail ships logs to Loki.
- Log retention configured in Loki.
- No persistent log files inside containers.

## 11. Resource Limits

Production containers have CPU and memory limits to prevent noisy neighbor issues and ensure predictable performance.

## 12. Image Registry

- Images built in CI/CD and pushed to GitHub Container Registry (GHCR) or private registry.
- Image tags: `commit-sha`, `branch`, `semver`.
- Production deployments use immutable semver tags.
- Vulnerability scanning with Trivy before promotion.

## 13. Development Workflow

- Developers use `docker-compose.dev.yml` locally.
- Hot reload for Next.js and NestJS via volume mounts.
- Prisma migrations run against local PostgreSQL.
- Seeded demo data for testing.

## 14. Telephony Containers

ViciDial and Asterisk are containerized but require special networking:
- Asterisk containers use host networking or dedicated public IPs for SIP/RTP.
- ViciDial container uses internal database and exposes web/manager ports.
- Recording volumes mounted to Asterisk and uploaded by workers.

## 15. Monitoring Containers

See `56-monitoring.md`. Monitoring stack includes:
- Prometheus (metrics)
- Grafana (visualization)
- Loki (logs)
- Promtail (log shipping)
- Node Exporter (host metrics)

## 16. Future Kubernetes Migration

When scale demands, Docker Compose services map to Kubernetes resources:
- Deployment per stateless service.
- StatefulSet for PostgreSQL and Redis (or managed services).
- PersistentVolumeClaim for MinIO.
- Ingress for Nginx routing.
- HorizontalPodAutoscaler for API/web/worker.
- Secrets/ConfigMap for configuration.
