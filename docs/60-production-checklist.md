# 60 — Production Checklist

**Document Control**

| Property | Value |
|----------|-------|
| Title | Production Checklist |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document provides a production readiness checklist for the RDCS In-House Dialer Platform. It is used before go-live and major releases.

## 2. Infrastructure

- [ ] Servers provisioned and hardened (Ubuntu CIS benchmarks).
- [ ] Docker and Docker Compose installed and configured.
- [ ] Network segmentation and firewall rules applied.
- [ ] Nginx load balancers configured and tested.
- [ ] Cloudflare WAF/DNS configured.
- [ ] TLS certificates installed and auto-renewal tested.
- [ ] Bastion host and VPN configured for admin access.
- [ ] Object storage provisioned and replicated.
- [ ] Backup storage configured.
- [ ] Disaster recovery site prepared and tested.

## 3. Database

- [ ] PostgreSQL primary and replica deployed.
- [ ] WAL archiving configured and tested.
- [ ] Prisma migrations applied successfully.
- [ ] Indexes and partitions created.
- [ ] Row-level security policies configured (if applicable).
- [ ] Database backups scheduled and verified.
- [ ] Read replica tested for reporting queries.
- [ ] Connection pooling configured.
- [ ] Database monitoring enabled.

## 4. Redis

- [ ] Redis deployed with Sentinel/Cluster for HA.
- [ ] Persistence (AOF + RDB) enabled.
- [ ] Authentication and TLS configured.
- [ ] BullMQ queues created and workers tested.
- [ ] Redis backups scheduled.
- [ ] Redis monitoring enabled.

## 5. Application

- [ ] API, web, socket, and worker containers deployed.
- [ ] Health checks passing (`/health`, `/health/ready`, `/health/live`).
- [ ] API Gateway rate limiting and CORS configured.
- [ ] Authentication and authorization tested.
- [ ] Tenant isolation verified.
- [ ] All feature modules deployed and functional.
- [ ] Background workers processing jobs.
- [ ] Blue/green deployment tested.
- [ ] Rollback procedure tested.

## 6. Telephony

- [ ] ViciDial/Asterisk deployed and configured.
- [ ] SIP trunks from carriers provisioned and tested.
- [ ] Caller IDs registered and rotated.
- [ ] Telephony adapter connected and events flowing.
- [ ] Recording capture and upload tested.
- [ ] AMD tested with sample calls.
- [ ] Agent WebRTC/SIP phones registered.
- [ ] Listen/whisper/barge tested.
- [ ] Telephony failover tested.

## 7. Security

- [ ] Secrets stored in secret manager or Docker secrets.
- [ ] JWT keys generated and rotated.
- [ ] Database credentials secured.
- [ ] API keys scoped and revocable.
- [ ] WAF rules and rate limiting active.
- [ ] Security headers applied.
- [ ] CSP configured.
- [ ] Encryption at rest and in transit verified.
- [ ] MFA enforced for privileged roles.
- [ ] Penetration test completed (or scheduled).
- [ ] Vulnerability scan clean.
- [ ] Audit logging enabled.

## 8. Compliance

- [ ] DNC lists configured.
- [ ] Timezone calling windows configured.
- [ ] TCPA abandon rate guards configured.
- [ ] Recording consent policy configured.
- [ ] Compliance reports tested.
- [ ] Data retention policies configured.
- [ ] GDPR/CCPA data subject request process documented.

## 9. Monitoring & Observability

- [ ] Prometheus scraping metrics.
- [ ] Grafana dashboards configured.
- [ ] Loki ingesting logs.
- [ ] Sentry receiving errors.
- [ ] Alert rules configured and tested.
- [ ] Alert routing to Slack/PagerDuty verified.
- [ ] Health checks and uptime monitoring active.
- [ ] Synthetic monitoring tests running.
- [ ] Log retention policies configured.

## 10. Testing

- [ ] Unit test coverage > 80%.
- [ ] Integration tests passing.
- [ ] E2E tests passing for critical paths.
- [ ] Load tests completed at target concurrency.
- [ ] Telephony integration tests passing.
- [ ] Security tests passing.
- [ ] Performance targets met.
- [ ] Regression test suite passing.

## 11. Documentation

- [ ] Runbooks created for common incidents.
- [ ] Deployment runbook reviewed.
- [ ] Rollback runbook reviewed.
- [ ] DR runbook reviewed and tested.
- [ ] On-call rotation defined.
- [ ] API documentation published.
- [ ] User guides and training materials prepared.
- [ ] Architecture documents updated.

## 12. Training & Operations

- [ ] Operations team trained on platform.
- [ ] Support team trained on common issues.
- [ ] Compliance team trained on DNC/TCPA tools.
- [ ] Supervisors trained on dashboards and monitoring.
- [ ] Agents trained on dialer interface.
- [ ] Escalation procedures defined.

## 13. Vendor & Carriers

- [ ] Carrier contracts signed and SIP trunks tested.
- [ ] DID routing confirmed.
- [ ] Support contacts documented.
- [ ] SLAs reviewed and accepted.
- [ ] Billing and capacity monitoring configured.

## 14. Go-Live Sign-Off

- [ ] All checklist items completed or accepted with risk sign-off.
- [ ] Stakeholder approval obtained.
- [ ] Go-live window scheduled.
- [ ] Rollback plan ready.
- [ ] Communication plan executed.
- [ ] Post-go-live monitoring plan active.
