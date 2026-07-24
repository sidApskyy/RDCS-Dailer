# 53 — Security Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Security Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the security architecture for the RDCS In-House Dialer Platform. Security is treated as a first-class architectural concern across all layers.

## 2. Security Principles

- **Defense in Depth**: Multiple layers of security controls.
- **Least Privilege**: Users and services have minimum necessary access.
- **Zero Trust**: Verify every request, even inside the network.
- **Secure by Default**: Secure configurations out of the box.
- **Data Minimization**: Collect and store only necessary data.
- **Auditability**: Log all security-relevant events.

## 3. Security Layers

### 3.1 Perimeter Security

- Cloudflare WAF and DDoS protection.
- TLS 1.2+ for all external traffic.
- Nginx reverse proxy with rate limiting and security headers.
- Geo-blocking and IP whitelisting options.

### 3.2 Application Security

- Authentication: JWT, MFA, SSO.
- Authorization: RBAC with tenant isolation.
- Input validation: Zod/class-validator at API boundary.
- Output encoding: React escapes output; API returns safe JSON.
- CSRF protection: SameSite cookies and token headers.
- XSS prevention: CSP headers, input sanitization.
- SQL injection prevention: Prisma ORM parameterized queries.

### 3.3 Data Security

- Encryption at rest: PostgreSQL, Redis persistence, S3/MinIO.
- Encryption in transit: TLS for all services, mTLS where feasible.
- Column-level encryption for sensitive fields (MFA secrets, API credentials).
- PII handling per GDPR/CCPA and tenant policies.

### 3.4 Infrastructure Security

- Private networks for databases and telephony.
- Bastion host / VPN for admin access.
- Docker containers run as non-root with minimal privileges.
- Host hardening via Ansible/Ubuntu CIS benchmarks.
- Secrets externalized to secret manager.

### 3.5 Telephony Security

- AMI/ARI credentials rotated and IP-whitelisted.
- SIP-TLS and SRTP where supported.
- Fraud detection on calling patterns.
- WebRTC over WSS with DTLS-SRTP.

## 4. Authentication Security

- Passwords hashed with bcrypt (cost 12+).
- MFA enforced for privileged roles.
- Account lockout after failed attempts.
- Session TTL, idle timeout, and revocation.
- Secure token storage (http-only cookies, Redis).
- SSO via SAML/OIDC with signed assertions.

## 5. Authorization Security

- Permission evaluation at API gateway and service layer.
- Tenant isolation enforced in every query.
- Data scope filtering prevents horizontal privilege escalation.
- No trust in client-side permission checks.
- Audit logging of denied authorization attempts.

## 6. API Security

- Rate limiting per tenant, user, and endpoint.
- API versioning and deprecation handling.
- OpenAPI docs restricted in production.
- API keys scoped and revocable.
- Input size limits and timeout controls.
- CORS configured for allowed origins.

## 7. WebSocket Security

- WSS only in production.
- JWT validation on handshake.
- Room-based scoping prevents cross-tenant event leakage.
- Monitoring of connection anomalies.

## 8. Webhook Security

- HMAC-SHA256 signatures on payloads.
- HTTPS-only delivery.
- Retry with exponential backoff.
- Secret rotation support.
- Delivery logging for audit.

## 9. Storage Security

- S3/MinIO buckets private; access via signed URLs or IAM roles.
- Bucket policies enforce TLS and restrict actions.
- Encryption at rest (SSE-S3, SSE-KMS, or MinIO SSE).
- Lifecycle policies for retention and deletion.
- MFA delete for critical buckets (future).

## 10. Database Security

- PostgreSQL access restricted to application servers.
- TLS connections required.
- Least-privilege database users per service.
- Row-level security (RLS) policies optional.
- Regular backups encrypted and access-controlled.
- DDL changes audited.

## 11. Redis Security

- Authentication required.
- TLS in production.
- No sensitive data in keys.
- Command renaming or ACLs for sensitive commands (future).
- Persistence files encrypted at rest.

## 12. Container Security

- Minimal base images (Alpine/Debian Slim).
- Multi-stage builds to reduce attack surface.
- Non-root user execution.
- Read-only filesystems where possible.
- Image scanning with Trivy in CI/CD.
- No secrets in image layers.

## 13. Network Security

- Segmentation into DMZ, application, data, telephony, management zones.
- Firewall rules enforce least privilege.
- Internal mTLS for service-to-service where feasible.
- VPN and bastion for admin access.
- Network monitoring and anomaly detection.

## 14. Compliance & Privacy

- TCPA controls: DNC, timezone, abandon rate.
- GDPR/CCPA: data subject rights, deletion, export.
- Recording consent: configurable per jurisdiction.
- Data residency: tenant region configuration.
- Retention and deletion policies.

## 15. Incident Response

- Security incidents logged and alerted.
- Runbook for common incidents (breach, credential leak, DDoS).
- Automated rollback for malicious deployments.
- Forensic logging preserved.
- Contact list and escalation procedures.

## 16. Security Testing

- SAST in CI/CD (CodeQL, SonarQube).
- Dependency scanning (npm audit, Trivy).
- Container image scanning.
- Quarterly vulnerability scans.
- Annual third-party penetration testing.
- Security-focused unit and integration tests.

## 17. Security Monitoring

- Failed login attempts and lockouts.
- Authorization denials.
- Rate limit breaches.
- Unusual API or WebSocket patterns.
- SIP/AMI anomaly detection.
- Data export and recording access audits.
- Alerts to security team via Slack/PagerDuty.

## 18. Secure Development Lifecycle

- Threat modeling for major features.
- Security code review checklist.
- Static and dynamic analysis in CI.
- Security training for engineering team.
- Bug bounty program (future).
