# 55 — Secrets Management

**Document Control**

| Property | Value |
|----------|-------|
| Title | Secrets Management |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the secrets management strategy for the RDCS In-House Dialer Platform. Secrets include credentials, API keys, tokens, certificates, and encryption keys.

## 2. Secrets Inventory

| Secret | Type | Used By | Rotation Frequency |
|--------|------|---------|-------------------|
| JWT signing key | Symmetric key | Auth service | 90 days |
| JWT refresh key | Symmetric key | Auth service | 90 days |
| Database password | Password | API, workers | 180 days |
| Redis password | Password | API, workers | 180 days |
| MinIO root credentials | Access key/secret | API, workers | 180 days |
| API key hashes | Hashed tokens | Integration clients | On demand |
| API key plaintext | Token | Shown once to user | On rotation |
| Webhook secrets | Shared secret | Webhook service | On demand |
| Integration credentials | OAuth tokens/passwords | Integration service | On provider expiry |
| MFA secrets | TOTP seed | Auth service | On user reset |
| AMI credentials | Password | Telephony adapter | 180 days |
| SIP trunk credentials | Username/password | Asterisk | Per carrier |
| TLS certificates | Certificate/key | Nginx, services | 60-90 days |
| KMS credentials | API key/role | Encryption service | Per provider |
| Cloudflare API token | Token | CI/CD | 180 days |
| Sentry DSN | DSN | Application | On demand |

## 3. Secret Storage Options

### 3.1 Production

- HashiCorp Vault or cloud-native secret manager (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager).
- Secrets injected at runtime; never committed to source control.
- Docker secrets for Compose deployments if Vault unavailable.

### 3.2 Development/Staging

- `.env` files stored outside source control.
- Docker Compose secrets via local files.
- No production secrets in development environments.

## 4. Secret Injection

### 4.1 Application Startup

```bash
# Application reads secrets from environment variables populated by secret manager
export JWT_SECRET=$(vault read -field=secret rdcs/jwt-secret)
export DATABASE_URL=$(vault read -field=url rdcs/database)
node dist/main.js
```

### 4.2 Docker Compose

```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
services:
  api:
    secrets:
      - jwt_secret
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
```

## 5. Secret Rotation

### 5.1 Automated Rotation

- JWT signing keys rotated via CI/CD pipeline with zero-downtime key rollover.
- TLS certificates renewed automatically via certbot or cert-manager.
- Database credentials rotated during maintenance windows with connection pool draining.

### 5.2 Manual Rotation

- AMI/SIP credentials rotated after personnel changes or suspected compromise.
- API keys rotated via admin UI.
- Webhook secrets regenerated via UI and communicated to subscriber.

### 5.3 Rotation Procedure

1. Generate new secret in secret manager.
2. Deploy to application with dual-key support where possible.
3. Verify all services accept new secret.
4. Revoke old secret after grace period.
5. Update audit log.

## 6. API Key Management

- API keys generated with high entropy (256-bit).
- Hashed with SHA-256 and stored in database.
- Plaintext shown only once on creation.
- Keys scoped to tenant and permission set.
- Revocation immediate across all services.
- Usage logged and rate-limited.

## 7. Credential Transmission

- Secrets never sent over email or chat.
- Use secure secret manager sharing or one-time encrypted channels.
- CI/CD pipelines use short-lived tokens or OIDC.

## 8. Audit & Monitoring

- All secret access logged in secret manager audit log.
- Alerts on unusual secret retrieval patterns.
- Failed authentication attempts using old secrets tracked.
- Secret rotation events logged.

## 9. Leak Response

If a secret is suspected leaked:
1. Revoke the secret immediately.
2. Rotate all related credentials.
3. Review audit logs for unauthorized access.
4. Notify security team and affected tenants.
5. Update incident response runbook.

## 10. Development Secrets Hygiene

- No `.env` files committed to git.
- Use `.env.example` with placeholder values.
- Pre-commit hooks scan for secrets.
- GitHub secret scanning enabled.
- Developers use local secret manager or secure environment files.

## 11. CI/CD Secrets

- CI/CD secrets stored in GitHub Actions secrets.
- Short-lived credentials preferred.
- No production secrets printed in logs.
- Deployment scripts pull secrets from Vault at deploy time.

## 12. Future Enhancements

- Dynamic secrets for databases (Vault database secrets engine).
- Just-in-time credentials for admin access.
- Secret usage analytics and anomaly detection.
- Hardware security module (HSM) for high-sensitivity keys.
