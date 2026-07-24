# 20 — Reverse Proxy Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Reverse Proxy Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the reverse proxy architecture for the RDCS In-House Dialer Platform. Nginx is used as the reverse proxy, load balancer, static file server, and TLS terminator.

## 2. Role of Nginx

- **Reverse Proxy**: Routes client requests to appropriate backend services.
- **Load Balancer**: Distributes traffic across multiple API and web containers.
- **TLS Terminator**: Handles HTTPS encryption and certificate management.
- **Static File Server**: Serves Next.js static assets and uploaded files.
- **Rate Limiter**: Enforces request rate limits at the edge.
- **WebSocket Proxy**: Upgrades WebSocket connections to Socket.IO gateway.
- **Security Gateway**: Applies headers, blocks malicious traffic, hides backend details.

## 3. Reverse Proxy Topology

```
Internet
    │
Cloudflare
    │
Nginx Load Balancer Pair (HAProxy/Keepalived)
    │
    ├─ / → Next.js Web (upstream web)
    ├─ /api/v1/* → NestJS API (upstream api)
    ├─ /socket.io/* → Socket.IO Gateway (upstream socket)
    ├─ /monitoring/* → Grafana (IP-restricted)
    ├─ /static/* → Static file cache
    └─ /.well-known/acme-challenge/* → Certbot
```

## 4. Upstream Definitions

```nginx
upstream web_upstream {
    least_conn;
    server web-1:3000 max_fails=3 fail_timeout=30s;
    server web-2:3000 max_fails=3 fail_timeout=30s;
}

upstream api_upstream {
    least_conn;
    server api-1:4000 max_fails=3 fail_timeout=30s;
    server api-2:4000 max_fails=3 fail_timeout=30s;
    server api-3:4000 max_fails=3 fail_timeout=30s;
}

upstream socket_upstream {
    ip_hash;
    server socket-1:4001 max_fails=3 fail_timeout=30s;
    server socket-2:4001 max_fails=3 fail_timeout=30s;
}

upstream grafana_upstream {
    server grafana:3000;
}
```

## 5. Location Routing

### 5.1 Frontend

```nginx
location / {
    proxy_pass http://web_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Tenant-Domain $host;
    proxy_cache_bypass $http_upgrade;
}
```

### 5.2 API

```nginx
location /api/ {
    proxy_pass http://api_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Tenant-Domain $host;
    proxy_read_timeout 60s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
}
```

### 5.3 WebSocket

```nginx
location /socket.io/ {
    proxy_pass http://socket_upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

### 5.4 Monitoring

```nginx
location /monitoring/ {
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    deny all;

    proxy_pass http://grafana_upstream;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 5.5 Static Assets & Caching

```nginx
location /_next/static/ {
    proxy_pass http://web_upstream;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /static/ {
    alias /var/www/static/;
    expires 7d;
    add_header Cache-Control "public";
}
```

## 6. TLS Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name app.rdcs.example.com;

    ssl_certificate /etc/letsencrypt/live/app.rdcs.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.rdcs.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / { ... }
    location /api/ { ... }
    location /socket.io/ { ... }
}

server {
    listen 80;
    server_name app.rdcs.example.com;
    return 301 https://$server_name$request_uri;
}
```

## 7. Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

location /api/v1/auth/ {
    limit_req zone=auth_limit burst=20 nodelay;
    proxy_pass http://api_upstream;
}

location /api/ {
    limit_req zone=api_limit burst=200 nodelay;
    proxy_pass http://api_upstream;
}
```

Tenant-level rate limiting is enforced in the API Gateway layer; Nginx provides IP-level protection.

## 8. Load Balancing Strategy

- **Web/API**: `least_conn` to distribute load to the least busy container.
- **WebSocket**: `ip_hash` to maintain sticky sessions for Socket.IO (though Socket.IO supports clustering via Redis adapter).
- **Health Checks**: Passive Nginx health checks via `max_fails` and `fail_timeout`; active checks via API `/health` endpoint.

## 9. Blue/Green Deployment Support

- Two upstream groups: `api_blue` and `api_green`.
- During deployment, traffic is switched from active to inactive group via Nginx config reload.
- Zero-downtime cutover with `nginx -s reload`.

## 10. Security Headers

Nginx applies the following security headers globally:

- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Content-Security-Policy` (configured per environment)
- `Permissions-Policy`

## 11. Logging

- Access logs in JSON format for Loki ingestion.
- Upstream response time, status, and tenant domain logged.
- Error logs forwarded to Loki.
- Sensitive query parameters excluded from logs.

## 12. Caching

- Static Next.js assets cached for 1 year (hashed filenames).
- API responses generally not cached unless explicitly marked.
- Monitoring assets cached for short durations.
- Bust cache via filename hashing for static assets.

## 13. Compression

```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1024;
```

## 14. High Availability

- Two Nginx nodes with Keepalived/VRRP for virtual IP failover.
- Cloudflare DNS health checks route to healthy origin.
- Configuration synchronized via Git and CI/CD.

## 15. Future Enhancements

- Migrate to Ingress Controller in Kubernetes.
- Implement service mesh sidecar proxies for mTLS.
- Add Web Application Firewall rules directly in Nginx.
- Enable HTTP/3 with QUIC.
