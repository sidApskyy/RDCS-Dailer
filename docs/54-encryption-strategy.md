# 54 — Encryption Strategy

**Document Control**

| Property | Value |
|----------|-------|
| Title | Encryption Strategy |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the encryption strategy for the RDCS In-House Dialer Platform. Encryption is applied to data in transit, at rest, and for sensitive application-level fields.

## 2. Encryption in Transit

### 2.1 External Traffic

- All external traffic uses HTTPS (TLS 1.2 or higher).
- Cloudflare and Nginx terminate TLS with valid certificates.
- Weak cipher suites disabled.
- HSTS header enforced.

### 2.2 Internal Traffic

- API to database, Redis, and MinIO uses TLS where supported.
- Internal service-to-service communication uses TLS or mTLS where feasible.
- WebSocket uses WSS.
- SIP-TLS and SRTP for telephony where supported.
- WebRTC uses DTLS-SRTP.

### 2.3 Certificate Management

- Let's Encrypt for public certificates.
- Internal CA or cert-manager for internal certificates.
- Automated renewal and monitoring.
- Certificate pinning avoided due to operational complexity.

## 3. Encryption at Rest

### 3.1 PostgreSQL

- PostgreSQL data directory encrypted using full-disk encryption (LUKS) or managed database encryption.
- Backups encrypted with AES-256.
- WAL archives encrypted.

### 3.2 Redis

- Redis persistence files (AOF/RDB) on encrypted volumes.
- TLS for replication in cluster/sentinel mode.

### 3.3 Object Storage

- S3: SSE-S3 or SSE-KMS encryption.
- MinIO: Server-side encryption with KMS.
- Recording files encrypted by default.
- Lifecycle policies manage retention and deletion.

### 3.4 Host Volumes

- Full-disk encryption on Ubuntu servers.
- Encrypted backups for disaster recovery.

## 4. Application-Level Encryption

### 4.1 Sensitive Fields

The following fields are encrypted at the application level before storage:

| Field | Encryption Method | Storage |
|-------|-------------------|---------|
| User password hash | bcrypt | PostgreSQL |
| MFA secret | AES-256-GCM + KMS | PostgreSQL |
| API key plaintext | Hashed (SHA-256) + encrypted backup | Secret manager / DB |
| Webhook secrets | AES-256-GCM | PostgreSQL |
| Integration credentials | AES-256-GCM | PostgreSQL |
| SIP/AMI credentials | AES-256-GCM | Secret manager |
| JWT secrets | Secret manager | Secret manager |

### 4.2 Encryption Service

```typescript
interface IEncryptionService {
  encrypt(plaintext: string, keyId?: string): Promise<EncryptedValue>;
  decrypt(encryptedValue: EncryptedValue): Promise<string>;
  rotateKey(encryptedValue: EncryptedValue, newKeyId: string): Promise<EncryptedValue>;
}

interface EncryptedValue {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
  algorithm: string;
}
```

### 4.3 Key Management

- Encryption keys managed by a KMS (HashiCorp Vault, AWS KMS, or cloud equivalent).
- Master key never stored in application code or database.
- Key rotation supported; older keys retained for decryption until data is re-encrypted.
- Key access audited.

## 5. Recording Encryption

- Recordings encrypted in object storage using SSE.
- Optional client-side encryption for highly sensitive recordings.
- Playback and download use signed HTTPS URLs.
- Encryption key IDs tracked in recording metadata.

## 6. Backup Encryption

- Database backups encrypted with AES-256 before leaving the server.
- Backup encryption keys stored in KMS.
- Backup files uploaded to encrypted object storage.
- Encrypted backups tested for restore capability.

## 7. Key Rotation

- JWT signing keys rotated every 90 days.
- Application encryption keys rotated annually.
- TLS certificates renewed every 60-90 days.
- AMI/SIP credentials rotated every 180 days or on suspected compromise.
- API keys rotated on demand or on schedule.

## 8. Secrets Handling

See `55-secrets-management.md` for details on secret storage, rotation, and access control.

## 9. Compliance Mapping

| Requirement | Control |
|-------------|---------|
| Data encryption at rest | Full-disk encryption + SSE + app-level encryption |
| Data encryption in transit | TLS 1.2+ for all traffic |
| Key management | KMS with audit and rotation |
| PII protection | Column-level encryption, access controls |
| Recording protection | Encrypted storage, signed access |
| Backup protection | Encrypted backups, secure storage |

## 10. Testing & Validation

- Verify TLS configuration with SSL Labs or similar tools.
- Test backup encryption and restoration.
- Validate application-level encryption/decryption in unit tests.
- Audit key rotation procedures.
- Penetration testing includes encryption review.
