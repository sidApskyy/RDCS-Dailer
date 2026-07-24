# 22 — Docker Compose

**Document Control**

| Property | Value |
|----------|-------|
| Title | Docker Compose |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document provides the complete Docker Compose configuration for the RDCS In-House Dialer Platform. It includes base, development, staging, production, telephony, and monitoring compose files.

## 2. File Inventory

- `docker-compose.base.yml`: Common service definitions.
- `docker-compose.dev.yml`: Development overrides.
- `docker-compose.staging.yml`: Staging overrides.
- `docker-compose.prod.yml`: Production overrides.
- `docker-compose.telephony.yml`: ViciDial and Asterisk services.
- `docker-compose.monitoring.yml`: Observability stack.
- `.env`: Environment variables (not committed; use `.env.example`).

## 3. Base Compose (`docker-compose.base.yml`)

```yaml
version: '3.8'

x-node-env: &node-env
  NODE_ENV: ${NODE_ENV:-development}

services:
  postgres:
    image: postgres:15
    container_name: rdcs_postgres
    environment:
      POSTGRES_USER: ${DB_USER:-rdcs}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-rdcs_dev}
      POSTGRES_DB: ${DB_NAME:-rdcs}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-rdcs} -d ${DB_NAME:-rdcs}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - rdcs-network

  redis:
    image: redis:7-alpine
    container_name: rdcs_redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-rdcs_dev}
    volumes:
      - redis_data:/data
    ports:
      - "${REDIS_PORT:-6379}:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - rdcs-network

  minio:
    image: minio/minio
    container_name: rdcs_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    volumes:
      - minio_data:/data
    ports:
      - "${MINIO_API_PORT:-9000}:9000"
      - "${MINIO_CONSOLE_PORT:-9001}:9001"
    healthcheck:
      test: ["CMD", "sh", "-c", "curl -f http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - rdcs-network

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    container_name: rdcs_api
    environment:
      <<: *node-env
      DATABASE_URL: postgresql://${DB_USER:-rdcs}:${DB_PASSWORD:-rdcs_dev}@postgres:5432/${DB_NAME:-rdcs}?schema=public
      REDIS_URL: redis://:${REDIS_PASSWORD:-rdcs_dev}@redis:6379
      JWT_SECRET: ${JWT_SECRET:-dev-jwt-secret-change-in-production}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-dev-refresh-secret}
      PORT: 4000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "${API_PORT:-4000}:4000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - rdcs-network

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    container_name: rdcs_web
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:4000/api/v1}
      NEXT_PUBLIC_WS_URL: ${NEXT_PUBLIC_WS_URL:-http://localhost:4001}
      PORT: 3000
    depends_on:
      - api
    ports:
      - "${WEB_PORT:-3000}:3000"
    networks:
      - rdcs-network

  socket:
    build:
      context: ./apps/socket
      dockerfile: Dockerfile
    container_name: rdcs_socket
    environment:
      <<: *node-env
      REDIS_URL: redis://:${REDIS_PASSWORD:-rdcs_dev}@redis:6379
      PORT: 4001
    depends_on:
      redis:
        condition: service_healthy
    ports:
      - "${SOCKET_PORT:-4001}:4001"
    networks:
      - rdcs-network

  worker:
    build:
      context: ./apps/worker
      dockerfile: Dockerfile
    container_name: rdcs_worker
    environment:
      <<: *node-env
      DATABASE_URL: postgresql://${DB_USER:-rdcs}:${DB_PASSWORD:-rdcs_dev}@postgres:5432/${DB_NAME:-rdcs}?schema=public
      REDIS_URL: redis://:${REDIS_PASSWORD:-rdcs_dev}@redis:6379
      MINIO_ENDPOINT: ${MINIO_ENDPOINT:-http://minio:9000}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - rdcs-network

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  rdcs-network:
    driver: bridge
```

## 4. Development Compose (`docker-compose.dev.yml`)

```yaml
version: '3.8'

services:
  api:
    build:
      target: development
    volumes:
      - ./apps/api:/app
      - /app/node_modules
      - /app/dist
    command: npm run start:dev
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug

  web:
    build:
      target: development
    volumes:
      - ./apps/web:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev
    environment:
      NODE_ENV: development

  socket:
    build:
      target: development
    volumes:
      - ./apps/socket:/app
      - /app/node_modules
      - /app/dist
    command: npm run start:dev

  worker:
    build:
      target: development
    volumes:
      - ./apps/worker:/app
      - /app/node_modules
      - /app/dist
    command: npm run start:dev

  postgres:
    ports:
      - "5432:5432"
    volumes:
      - ./docker/init-scripts:/docker-entrypoint-initdb.d

  redis:
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"
    networks:
      - rdcs-network
```

## 5. Production Compose (`docker-compose.prod.yml`)

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/rdcs/api:${API_VERSION}
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
      NODE_ENV: production
      DATABASE_URL_FILE: /run/secrets/db_url
      REDIS_URL_FILE: /run/secrets/redis_url
      JWT_SECRET_FILE: /run/secrets/jwt_secret
    secrets:
      - db_url
      - redis_url
      - jwt_secret

  web:
    image: ghcr.io/rdcs/web:${WEB_VERSION}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  socket:
    image: ghcr.io/rdcs/socket:${SOCKET_VERSION}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  worker:
    image: ghcr.io/rdcs/worker:${WORKER_VERSION}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G

  nginx:
    image: ghcr.io/rdcs/nginx:${NGINX_VERSION}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - web
      - socket

secrets:
  db_url:
    file: ./secrets/db_url.txt
  redis_url:
    file: ./secrets/redis_url.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

## 6. Telephony Compose (`docker-compose.telephony.yml`)

```yaml
version: '3.8'

services:
  vicidial:
    image: ghcr.io/rdcs/vicidial:${VICIDIAL_VERSION}
    container_name: rdcs_vicidial
    environment:
      DB_HOST: ${VICIDIAL_DB_HOST}
      DB_USER: ${VICIDIAL_DB_USER}
      DB_PASSWORD_FILE: /run/secrets/vicidial_db_password
    ports:
      - "8080:80"
    volumes:
      - vicidial_data:/var/lib/mysql
    networks:
      - telephony-network
      - rdcs-network
    secrets:
      - vicidial_db_password

  asterisk:
    image: ghcr.io/rdcs/asterisk:${ASTERISK_VERSION}
    container_name: rdcs_asterisk
    network_mode: host
    environment:
      AMI_USER: ${ASTERISK_AMI_USER}
      AMI_PASSWORD_FILE: /run/secrets/asterisk_ami_password
    volumes:
      - asterisk_config:/etc/asterisk
      - asterisk_recordings:/var/spool/asterisk/monitor
    secrets:
      - asterisk_ami_password

secrets:
  vicidial_db_password:
    file: ./secrets/vicidial_db_password.txt
  asterisk_ami_password:
    file: ./secrets/asterisk_ami_password.txt

volumes:
  vicidial_data:
  asterisk_config:
  asterisk_recordings:

networks:
  telephony-network:
    driver: bridge
```

## 7. Monitoring Compose (`docker-compose.monitoring.yml`)

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./docker/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - rdcs-network
      - monitoring-network

  grafana:
    image: grafana/grafana
    volumes:
      - ./docker/monitoring/grafana:/etc/grafana/provisioning:ro
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    networks:
      - rdcs-network
      - monitoring-network

  loki:
    image: grafana/loki
    volumes:
      - ./docker/monitoring/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - monitoring-network

  promtail:
    image: grafana/promtail
    volumes:
      - ./docker/monitoring/promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    networks:
      - monitoring-network

  node-exporter:
    image: prom/node-exporter
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    networks:
      - monitoring-network

volumes:
  prometheus_data:
  grafana_data:
  loki_data:

networks:
  monitoring-network:
    driver: bridge
```

## 8. Environment File (`.env.example`)

```bash
# General
NODE_ENV=development
DOMAIN=localhost

# Database
DB_USER=rdcs
DB_PASSWORD=rdcs_dev
DB_NAME=rdcs
DB_PORT=5432
DATABASE_URL=postgresql://rdcs:rdcs_dev@localhost:5432/rdcs

# Redis
REDIS_PASSWORD=rdcs_dev
REDIS_URL=redis://:rdcs_dev@localhost:6379

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=http://localhost:9000

# JWT
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-in-production

# Ports
API_PORT=4000
WEB_PORT=3000
SOCKET_PORT=4001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:4001

# Telephony
VICIDIAL_DB_HOST=localhost
VICIDIAL_DB_USER=root
ASTERISK_AMI_USER=admin

# Sentry / Monitoring
SENTRY_DSN=
```

## 9. Usage Commands

```bash
# Development
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d

# Staging
docker compose -f docker-compose.base.yml -f docker-compose.staging.yml up -d

# Production
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d

# With telephony
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml -f docker-compose.telephony.yml up -d

# With monitoring
docker compose -f docker-compose.monitoring.yml up -d

# Run migrations
docker compose exec api npx prisma migrate deploy

# View logs
docker compose logs -f api

# Scale workers
docker compose up -d --scale worker=5 worker
```

## 10. Security Considerations

- Use `.env` files only for local development; never commit production secrets.
- Production uses Docker secrets or external secret manager.
- Restrict exposed ports in production; only Nginx and monitoring (if needed) should be public.
- Use read-only filesystems where possible in production.
- Run containers as non-root users.

## 11. Backup & Persistence

- Named volumes persist PostgreSQL, Redis, and MinIO data.
- Production volumes are backed up using host-level scripts or object storage replication.
- See `59-backup-strategy.md` for full backup procedures.
