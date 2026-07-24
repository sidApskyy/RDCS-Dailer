# 59 — Backup Strategy

**Document Control**

| Property | Value |
|----------|-------|
| Title | Backup Strategy |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the backup strategy for the RDCS In-House Dialer Platform. Backups ensure data recoverability, compliance, and disaster recovery capability.

## 2. Backup Scope

| Data | Backup Method | Frequency | Retention |
|------|---------------|-----------|-----------|
| PostgreSQL transactional data | pg_basebackup + WAL archiving | Continuous | 30 days daily + 7 years archive |
| PostgreSQL logical dumps | pg_dump | Daily | 30 days |
| Redis data | RDB snapshots + AOF | Hourly RDB, continuous AOF | 7 days |
| Object storage (recordings, exports) | Cross-region replication | Continuous | Per lifecycle policy |
| Application configuration | Git + encrypted secrets | On change | Indefinite |
| Docker Compose files | Git | On change | Indefinite |
| Nginx config / SSL certs | Git + cert backup | On change | Indefinite |
| Audit logs | PostgreSQL partition + archive | Continuous | 7 years |
| CDR/CEL | PostgreSQL + archive | Continuous | 7 years |

## 3. PostgreSQL Backup

### 3.1 Continuous WAL Archiving

- WAL files archived to object storage every completed segment.
- Enables point-in-time recovery (PITR).
- Archive command: `archive_command` to S3/MinIO.
- Monitoring of archive failures.

### 3.2 Full Base Backup

- Daily full base backup via `pg_basebackup` or `pgBackRest`.
- Stored in object storage with encryption.
- Backup verification via restore tests.

### 3.3 Logical Backup

- Daily `pg_dump` of critical schemas for portability.
- Stored in object storage.
- Useful for partial restores and migrations.

### 3.4 Backup Retention

- Daily backups: 30 days.
- Weekly backups: 12 weeks.
- Monthly backups: 1 year.
- Annual archives: 7 years (for compliance).

## 4. Redis Backup

- RDB snapshot every hour.
- AOF persistence enabled for durability.
- RDB files copied to object storage daily.
- Restore from RDB/AOF on Redis restart or failover.

## 5. Object Storage Backup

- Recordings and exports stored in primary object storage.
- Cross-region replication to secondary storage target.
- Versioning enabled to protect against accidental deletion.
- Lifecycle policies transition old objects to cold storage and delete per retention.

## 6. Configuration Backup

- Infrastructure as Code and config files in Git.
- Secrets backed up in secret manager with version history.
- SSL certificates backed up and renewed automatically.
- Environment files documented but not stored with secrets.

## 7. Backup Automation

- Backups scheduled via cron or orchestration tool.
- Backup jobs logged and monitored.
- Failure alerts sent to operations team.
- Backup success/failure reported in admin dashboard.

## 8. Backup Verification

- Monthly restore tests in isolated environment.
- Verify database integrity after restore.
- Verify object storage files are accessible.
- Document restore time and issues.

## 9. Encryption

- All backups encrypted at rest with AES-256.
- Backup encryption keys managed by KMS.
- Encryption keys stored separately from backups.
- In-transit encryption for backup uploads.

## 10. Backup Storage Locations

- Primary backups: local object storage (MinIO/S3) in primary region.
- Secondary copies: cross-region replicated storage.
- Optional offline/air-gapped copy for critical compliance data.

## 11. Restore Procedures

### 11.1 Database Restore

1. Identify target restore point (latest or PITR).
2. Provision new PostgreSQL instance.
3. Restore base backup.
4. Replay WAL files to target point.
5. Verify data integrity and connectivity.
6. Update application connection strings.
7. Run smoke tests.

### 11.2 Object Storage Restore

1. Identify files to restore.
2. Copy from replica or versioned storage.
3. Verify file integrity and metadata.
4. Update database references if needed.

### 11.3 Redis Restore

1. Stop Redis.
2. Copy RDB/AOF files to Redis data directory.
3. Start Redis.
4. Verify data and queue state.

## 12. Backup Monitoring

- Backup job success/failure.
- Backup size and duration trends.
- Storage capacity usage.
- Restore test results.
- Encryption and integrity check status.

## 13. Ransomware & Corruption Protection

- Immutable backups or write-once-read-many (WORM) storage where available.
- Offline or air-gapped backups for critical data.
- Separate credentials for backup storage.
- Regular integrity checks and restore tests.
