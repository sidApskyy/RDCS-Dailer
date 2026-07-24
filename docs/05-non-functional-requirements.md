# 05 — Non-Functional Requirements

**Document Control**

| Property | Value |
|----------|-------|
| Title | Non-Functional Requirements |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document captures the non-functional requirements (NFRs) for the RDCS In-House Dialer Platform. NFRs are organized by quality attribute and include measurable targets, design implications, and verification methods.

## 2. Availability

### NFR-AVL-001: Platform Uptime
The production platform shall achieve **99.9% uptime** measured monthly, excluding scheduled maintenance windows.

### NFR-AVL-002: Scheduled Maintenance
Maintenance windows shall be announced 72 hours in advance and not exceed 4 hours per month.

### NFR-AVL-003: Component Redundancy
Critical components (API, queue workers, Redis, PostgreSQL) shall be deployed with redundancy to eliminate single points of failure.

### NFR-AVL-004: Graceful Degradation
The system shall continue to operate in degraded mode if non-critical services (AI, reporting, analytics) become unavailable.

## 3. Scalability

### NFR-SCL-001: Concurrent Agents
The platform shall support **5,000 concurrent agents** per deployment with horizontal scaling of stateless API and worker tiers.

### NFR-SCL-002: Lead Processing
The platform shall process **1,000,000 leads per tenant per day**.

### NFR-SCL-003: CSV Import Throughput
The system shall import and validate **100,000 CSV rows within 10 minutes**.

### NFR-SCL-004: Call Event Ingestion
The system shall ingest **10,000 telephony events per second** during peak load.

### NFR-SCL-005: Horizontal Scaling
API and worker containers shall scale horizontally based on CPU, memory, and queue depth metrics.

## 4. Performance

### NFR-PER-001: API Latency
The p95 latency for authenticated CRUD API operations shall be **less than 100 ms**.

### NFR-PER-002: Dialer Decision Latency
The time from agent availability to call initiation decision shall be **less than 200 ms**.

### NFR-PER-003: WebSocket Event Latency
Real-time events shall be delivered to clients within **500 ms** of occurrence.

### NFR-PER-004: Dashboard Load Time
Dashboards shall render initial data within **2 seconds**.

### NFR-PER-005: Recording Playback Start
Recording playback shall begin within **2 seconds** of request.

### NFR-PER-006: Report Generation
Standard reports up to 1M rows shall complete within **60 seconds**; larger reports are offloaded to async workers.

## 5. Reliability & Fault Tolerance

### NFR-REL-001: Retry Policy
Transient failures in external integrations (webhooks, telephony adapter, storage) shall be retried with exponential backoff.

### NFR-REL-002: Dead Letter Queues
Jobs that exhaust retries shall be moved to a dead-letter queue with alerting and manual replay capability.

### NFR-REL-003: Circuit Breakers
The system shall use circuit breakers for external dependencies to prevent cascade failures.

### NFR-REL-004: Idempotency
All mutation endpoints and job processors shall be idempotent where feasible, using idempotency keys.

### NFR-REL-005: Data Consistency
Critical financial and compliance data shall be strongly consistent; eventual consistency is acceptable for analytics and reporting.

## 6. Security

### NFR-SEC-001: Encryption in Transit
All external and internal service communication shall use TLS 1.2 or higher.

### NFR-SEC-002: Encryption at Rest
All data stores (PostgreSQL, Redis persistence, S3/MinIO) shall use encryption at rest.

### NFR-SEC-003: Secret Management
All secrets, API keys, and credentials shall be managed through a secret manager (e.g., HashiCorp Vault, AWS Secrets Manager, Docker Secrets).

### NFR-SEC-004: Input Validation
All user inputs shall be validated using Zod at the API boundary and Prisma constraints at the database layer.

### NFR-SEC-005: Authentication
All API and WebSocket endpoints shall require valid authentication except explicitly whitelisted health/public endpoints.

### NFR-SEC-006: Authorization
All data access shall be authorized based on RBAC with tenant isolation.

### NFR-SEC-007: Rate Limiting
API and WebSocket endpoints shall enforce per-tenant and per-user rate limits.

### NFR-SEC-008: OWASP Compliance
The application shall follow OWASP Top 10 mitigation practices, including XSS, CSRF, injection, and insecure deserialization prevention.

### NFR-SEC-009: Audit Logging
All authentication, authorization, and data mutation events shall be logged immutably.

### NFR-SEC-010: Penetration Testing
Production releases shall undergo annual third-party penetration testing and quarterly vulnerability scans.

## 7. Maintainability

### NFR-MNT-001: Modular Architecture
The codebase shall be organized into bounded contexts and Clean Architecture layers to support independent evolution.

### NFR-MNT-002: Test Coverage
The system shall maintain minimum **80% unit test coverage** and **70% integration test coverage** for critical paths.

### NFR-MNT-003: Documentation
All public APIs shall be documented in OpenAPI 3.0; architecture decisions recorded in ADRs.

### NFR-MNT-004: Code Standards
All code shall follow the coding standards defined in `67-coding-standards.md`.

### NFR-MNT-005: Dependency Management
Dependencies shall be pinned, scanned for vulnerabilities, and updated on a regular cadence.

## 8. Observability

### NFR-OBS-001: Metrics
The system shall emit metrics for request latency, throughput, error rates, queue depth, agent state, and campaign health.

### NFR-OBS-002: Logging
All services shall emit structured JSON logs with correlation IDs and severity levels.

### NFR-OBS-003: Tracing
Distributed tracing shall be implemented across API, worker, and telephony adapter boundaries.

### NFR-OBS-004: Alerting
Critical alerts shall be routed to on-call engineers via PagerDuty/Slack/Email within 1 minute of threshold breach.

### NFR-OBS-005: Dashboards
Operational dashboards shall be available in Grafana for infrastructure, application, and business metrics.

## 9. Deployability

### NFR-DEP-001: Zero-Downtime Deployment
Production deployments shall use blue/green or rolling update strategies with no user-facing downtime.

### NFR-DEP-002: Infrastructure as Code
All infrastructure shall be defined in Docker Compose, with future Kubernetes manifests, and version-controlled.

### NFR-DEP-003: Automated Rollback
Failed deployments shall automatically roll back to the last known healthy version within 5 minutes.

### NFR-DEP-004: Environment Parity
Development, staging, and production environments shall be as identical as possible, using containerized services.

## 10. Disaster Recovery & Backup

### NFR-DR-001: Recovery Point Objective (RPO)
The RPO for transactional data shall be **15 minutes**; for recordings, **24 hours**.

### NFR-DR-002: Recovery Time Objective (RTO)
The RTO for core dialer services shall be **1 hour**; for analytics/reporting, **4 hours**.

### NFR-DR-003: Database Backups
PostgreSQL shall have continuous WAL archiving and point-in-time recovery capability.

### NFR-DR-004: Object Storage Backups
Recordings and exports shall be replicated across regions or to a secondary storage target.

### NFR-DR-005: Disaster Recovery Plan
A tested disaster recovery plan shall be documented and exercised at least annually.

## 11. Compliance & Legal

### NFR-COMP-001: TCPA Compliance
The system shall provide controls to satisfy TCPA requirements including abandon rate management, DNC scrubbing, and time-zone calling.

### NFR-COMP-002: GDPR/CCPA
Where applicable, the system shall support data subject requests, deletion, and exportable data records.

### NFR-COMP-003: Call Recording Consent
The system shall support jurisdictional consent models (one-party, two-party, business notification).

### NFR-COMP-004: Data Residency
Tenant data shall be stored in the region configured during tenant provisioning.

## 12. Usability

### NFR-USE-001: Agent Onboarding
A new agent shall be able to make their first call within **15 minutes** of login.

### NFR-USE-002: Accessibility
The UI shall meet WCAG 2.1 Level AA standards where feasible.

### NFR-USE-003: Browser Support
The application shall support the latest two versions of Chrome, Firefox, Edge, and Safari.

### NFR-USE-004: Mobile Responsiveness
Supervisor dashboards and admin pages shall be usable on tablets and large mobile devices.

## 13. Compatibility

### NFR-COMPAT-001: Telephony Adapter
The system shall integrate with ViciDial on day one and be replaceable with Asterisk ARI, FreeSWITCH, Twilio Voice, Amazon Connect, Genesys Cloud, or SIP providers without frontend or business logic changes.

### NFR-COMPAT-002: CRM Integration
The CRM integration layer shall support generic REST/JSON APIs and webhooks, with pre-built connectors for Salesforce, HubSpot, and Zoho in future phases.

### NFR-COMPAT-003: API Versioning
Public APIs shall be versioned with at least one prior version supported for 6 months after deprecation.
