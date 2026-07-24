# 18 — Infrastructure Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Infrastructure Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the infrastructure architecture for the RDCS In-House Dialer Platform. It covers compute, storage, networking, messaging, telephony, and supporting services deployed on Ubuntu servers with Docker and Docker Compose.

## 2. Infrastructure Goals

- High availability for core services.
- Horizontal scalability of stateless components.
- Fault tolerance and graceful degradation.
- Zero-downtime deployments.
- Security at every layer.
- Comprehensive observability.
- Disaster recovery capability.

## 3. Deployment Topology

The platform is deployed as a containerized workload on Ubuntu servers. The initial target is Docker Compose; Kubernetes is the future state.

### 3.1 Production Environment

```
Internet
    │
Cloudflare (WAF, CDN, DNS, DDoS)
    │
Nginx Load Balancer / Reverse Proxy (x2 HA)
    │
┌─────────────────────────────────────────────────────┐
│              Docker Compose Stack                  │
│                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐   │
│  │ Next.js Web │  │ NestJS API  │  │ Socket.IO│   │
│  │  (x2)       │  │  (x3)       │  │ Gateway  │   │
│  └─────────────┘  └─────────────┘  └──────────┘   │
│                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐   │
│  │ BullMQ      │  │ AI Worker   │  │ Webhook  │   │
│  │ Workers     │  │ (x2)        │  │ Worker   │   │
│  │ (x2)        │  │             │  │ (x2)     │   │
│  └─────────────┘  └─────────────┘  └──────────┘   │
│                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐   │
│  │ PostgreSQL  │  │ Redis       │  │ MinIO    │   │
│  │ Primary     │  │ (Cluster)   │  │ S3       │   │
│  │ + Replica   │  │             │  │ (x2)     │   │
│  └─────────────┘  └─────────────┘  └──────────┘   │
│                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐   │
│  │ Grafana     │  │ Prometheus  │  │ Loki     │   │
│  │             │  │             │  │          │   │
│  └─────────────┘  └─────────────┘  └──────────┘   │
│                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐   │
│  │ ViciDial    │  │ Asterisk    │  │ OpenVPN  │   │
│  │ (Manager)   │  │ (Media)     │  │ /Bastion │   │
│  └─────────────┘  └─────────────┘  └──────────┘   │
│                                                    │
└─────────────────────────────────────────────────────┘
```

## 4. Compute Layer

### 4.1 Web Tier
- **Next.js Web Application**: Serves the React frontend. Stateless, scaled horizontally.
- **NestJS API**: Handles business logic, REST APIs, WebSocket coordination. Stateless.
- **Socket.IO Gateway**: Dedicated gateway for real-time events to reduce API load.

### 4.2 Worker Tier
- **BullMQ Workers**: Process background jobs (imports, exports, AI, webhooks, notifications).
- **Dialer Worker**: Real-time dialer decision loop and pacing.
- **AI Worker**: Runs STT, summarization, sentiment, QA scoring.
- **Webhook Worker**: Reliable webhook delivery with retries.

### 4.3 Telephony Tier
- **ViciDial Manager**: Campaign and agent management, dialer logic disabled in favor of in-house logic.
- **Asterisk Servers**: Media handling, SIP signaling, recording capture, AMD.
- **SIP Registrars**: Handle SIP registrations and trunking.

### 4.4 Data Tier
- **PostgreSQL Primary**: Transactional data, relational integrity, audit logs.
- **PostgreSQL Read Replica**: Reporting and analytics queries.
- **Redis**: Cache, sessions, pub/sub, BullMQ backing store.
- **MinIO / S3**: Object storage for recordings, exports, imports.

### 4.5 Observability Tier
- **Prometheus**: Metrics collection.
- **Grafana**: Visualization and dashboards.
- **Loki**: Log aggregation.
- **Sentry**: Application error tracking.
- **Node Exporter**: Host metrics.

## 5. Server Specifications (Initial Sizing)

| Tier | Instance Type | Count | Notes |
|------|---------------|-------|-------|
| Load Balancer | 4 vCPU / 8 GB | 2 | Nginx HA pair |
| Application | 8 vCPU / 16 GB | 3 | API + Web + Socket |
| Worker | 8 vCPU / 16 GB | 3 | BullMQ + AI + Webhook |
| Database | 16 vCPU / 64 GB | 2 | Primary + Replica |
| Redis | 4 vCPU / 16 GB | 3 | Sentinel/Cluster |
| Storage | 4 vCPU / 8 GB | 2 | MinIO cluster |
| Telephony | 8 vCPU / 16 GB | 2 | ViciDial + Asterisk |
| Observability | 4 vCPU / 16 GB | 2 | Prometheus/Grafana/Loki |

Sizing is for 1,000 concurrent agents; scale horizontally for larger deployments.

## 6. High Availability

### 6.1 Application HA
- Multiple API and web containers behind Nginx load balancer.
- Health checks route traffic away from failed containers.
- Rolling updates for zero-downtime deployments.

### 6.2 Database HA
- PostgreSQL streaming replication to read replica.
- Automatic failover via Patroni or managed service (e.g., AWS RDS Multi-AZ).
- Continuous WAL archiving to object storage.

### 6.3 Redis HA
- Redis Sentinel for high availability.
- Future: Redis Cluster for sharding beyond single-node limits.

### 6.4 Object Storage HA
- MinIO deployed in distributed erasure-code mode.
- For AWS S3, use cross-region replication.

### 6.5 Telephony HA
- Asterisk servers deployed in active/active with load balancing via SIP proxies.
- ViciDial manager with backup; state synchronized via database.
- Multiple SIP trunks from different carriers for redundancy.

## 7. Scalability Strategy

- Stateless API and web containers scale horizontally.
- Worker queues scale independently based on queue depth.
- PostgreSQL read replicas for read-heavy reporting.
- Redis Cluster for cache and pub/sub at scale.
- Object storage scales with capacity.
- Telephony tier scales by adding Asterisk nodes and trunks.

## 8. Fault Tolerance

- Circuit breakers for external services (telephony, AI, webhooks).
- Dead-letter queues for failed jobs.
- Retry with exponential backoff for transient failures.
- Graceful degradation: if AI is down, calls continue; if reporting is down, core dialer continues.
- Database connection pooling and health checks.

## 9. Security Layers

- Cloudflare WAF and DDoS protection.
- Nginx TLS termination with Let's Encrypt certificates.
- Internal mTLS between services where feasible.
- Private networks for databases and telephony.
- Bastion host / VPN for administrative access.
- Secrets managed by HashiCorp Vault or cloud secret manager.

## 10. Network Architecture

See `19-network-architecture.md` for detailed network segmentation, firewall rules, and routing.

## 11. Disaster Recovery

- RPO: 15 minutes for transactional data; 24 hours for recordings.
- RTO: 1 hour for core dialer; 4 hours for reporting/analytics.
- Database backups to object storage with point-in-time recovery.
- Object storage cross-region replication.
- Documented runbook and annual DR drills.

See `58-disaster-recovery.md` and `59-backup-strategy.md` for full details.

## 12. Infrastructure as Code

- Docker Compose files for dev/staging/prod.
- Environment-specific `.env` files managed by secret manager.
- Future: Terraform/Pulumi for cloud resource provisioning.
- Ansible playbooks for Ubuntu server baseline configuration.
- GitHub Actions for CI/CD and deployment.

## 13. Cloud vs On-Premises

The architecture is cloud-agnostic but initially targeted at self-hosted Ubuntu servers. Key components can be substituted:

| Self-Hosted | Cloud Equivalent |
|-------------|------------------|
| PostgreSQL | AWS RDS, GCP Cloud SQL, Azure Database |
| Redis | AWS ElastiCache, Redis Cloud |
| MinIO | AWS S3, GCP Cloud Storage, Azure Blob |
| Nginx | AWS ALB, Cloudflare, Azure Front Door |
| Bare Metal | AWS EC2, GCP Compute, Azure VMs |

## 14. Capacity Planning

| Metric | Initial Target | Scale Trigger |
|--------|----------------|---------------|
| Concurrent agents | 1,000 | Add API/worker containers |
| Calls per minute | 3,000 | Add Asterisk nodes, trunks |
| Leads per day | 1M | Add import workers, DB replicas |
| Recordings per day | 50K | Add storage capacity, AI workers |
| API requests per second | 1,000 | Add API containers, DB read replicas |

## 15. Future Kubernetes Migration

When scale or operational complexity warrants it, the Docker Compose stack can migrate to Kubernetes:
- Deployments for API, web, workers.
- StatefulSets for PostgreSQL and Redis (or managed services).
- PersistentVolumes for MinIO.
- Helm charts for Grafana, Prometheus, Loki.
- Ingress controllers for Nginx functions.
- HorizontalPodAutoscaler for stateless services.
