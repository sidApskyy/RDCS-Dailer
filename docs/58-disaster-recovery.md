# 58 — Disaster Recovery

**Document Control**

| Property | Value |
|----------|-------|
| Title | Disaster Recovery |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the disaster recovery (DR) strategy for the RDCS In-House Dialer Platform. DR ensures business continuity in the event of infrastructure, service, or regional failures.

## 2. Recovery Objectives

| Objective | Target | Scope |
|-----------|--------|-------|
| RPO (Recovery Point Objective) | 15 minutes | Transactional data (PostgreSQL) |
| RPO | 24 hours | Recordings and object storage |
| RTO (Recovery Time Objective) | 1 hour | Core dialer services |
| RTO | 4 hours | Reporting, analytics, AI |
| RTO | 24 hours | Full production restoration |

## 3. Disaster Scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Single server failure | Service degraded | Redundancy, auto-failover |
| Database failure | Data unavailable | Streaming replica, Patroni failover |
| Redis failure | Cache/queue lost | Sentinel/Cluster HA, persistence |
| Data center failure | Region unavailable | DR site, cross-region backups |
| Carrier/SIP trunk failure | Calls fail | Multiple carriers, failover |
| Cloudflare outage | Edge unavailable | Direct origin fallback (limited) |
| Application bug | Service impaired | Rolling back deployment |
| Ransomware/data corruption | Data integrity risk | Immutable backups, point-in-time recovery |

## 4. DR Architecture

```
Primary Site (Active)
  ├─ Application stack (API, Web, Workers)
  ├─ PostgreSQL primary + replica
  ├─ Redis Sentinel/Cluster
  ├─ MinIO/S3 object storage
  ├─ ViciDial/Asterisk
  └─ Monitoring stack

DR Site (Warm Standby)
  ├─ Standby application stack (scaled down or off)
  ├─ PostgreSQL standby (streaming replication or restore from backups)
  ├─ Redis standby
  ├─ Replicated object storage
  ├─ Standby telephony (configured but not active)
  └─ Monitoring stack

Object Storage (Cross-region replication)
  ├─ Database backups
  ├─ WAL archives
  ├─ Recording files
  └─ Configuration/Secrets backups
```

## 5. Database DR

- PostgreSQL streaming replication to standby in DR site.
- Continuous WAL archiving to object storage.
- Patroni or managed service for automatic failover.
- Point-in-time recovery capability.
- Regular failover tests in staging.

## 6. Redis DR

- Redis Sentinel or Cluster for HA within primary site.
- Redis persistence (AOF + RDB) for data durability.
- Periodic RDB snapshots replicated to DR site.
- Queue depth and job state can be reconstructed from PostgreSQL and object storage if needed.

## 7. Object Storage DR

- MinIO distributed mode or S3 cross-region replication.
- Recordings and database backups replicated to DR region.
- Lifecycle policies manage retention.
- DR site can serve playback/downloads from replicated storage.

## 8. Application DR

- Container images stored in registry accessible from DR site.
- Infrastructure as Code (Docker Compose, future Terraform) for rapid redeployment.
- Configuration and secrets backed up and restorable.
- DR site can be scaled up within RTO.
- DNS failover to DR site if primary unavailable.

## 9. Telephony DR

- Multiple SIP trunks from different carriers.
- Asterisk nodes can be brought up in DR site with replicated config.
- ViciDial database replicated or restored from backups.
- DIDs configured with carrier failover routing.
- Agent phone re-registration to DR site after failover.

## 10. DR Procedures

### 10.1 Failover

1. Detect disaster via monitoring and on-call alert.
2. Confirm primary site unrecoverable within RTO.
3. Promote DR site database to primary.
4. Scale up DR application stack.
5. Update DNS to point to DR site.
6. Verify health checks and core dialer functionality.
7. Notify stakeholders.
8. Begin post-incident review.

### 10.2 Failback

1. Restore primary site infrastructure.
2. Re-establish replication from DR to primary.
3. Schedule maintenance window.
4. Switch DNS back to primary.
5. Verify functionality.
6. Resume normal operations.

## 11. DR Testing

- DR drills conducted at least annually.
- Staging environment failover tested quarterly.
- Backup restoration tests monthly.
- Document and update runbooks after each test.

## 12. DR Runbook

A detailed runbook is maintained separately covering:
- Contact escalation list.
- Step-by-step failover/failback commands.
- Verification checklists.
- Communication templates.
- Vendor/carrier contact information.

## 13. Data Integrity

- Backups verified with checksums and test restores.
- WAL replay tested for point-in-time recovery.
- Object storage integrity checks.
- Audit logs preserved during failover.

## 14. Compliance & Legal

- DR plan reviewed by compliance and legal teams.
- Data residency requirements respected during failover.
- Contractual SLAs with carriers and cloud providers considered.
- Incident documentation retained for regulatory review.
