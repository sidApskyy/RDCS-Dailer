# 01 — Executive Summary

**Document Control**

| Property | Value |
|----------|-------|
| Title | Executive Summary |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Purpose

This document provides a concise strategic overview of the RDCS In-House Dialer Platform initiative, summarizing business objectives, scope, approach, expected outcomes, and key investment themes for executive stakeholders and engineering leadership.

## 2. Business Context

The organization operates outbound contact center operations at scale and requires a modern, extensible, and cost-predictable dialer platform. Existing options impose high licensing costs, limited customization, and vendor lock-in. Building an in-house dialer platform, with ViciDial isolated as a replaceable telephony engine, delivers ownership of roadmap, compliance posture, and customer experience while preserving capital efficiency.

## 3. Strategic Objectives

- **Platform Ownership**: Full control over business logic, user experience, AI/ML roadmap, and integrations.
- **Telephony Independence**: ViciDial is used strictly as a telephony execution engine behind a vendor-neutral adapter layer.
- **Regulatory Compliance**: Native TCPA, DNC, time-zone, consent, and recording governance.
- **Operational Excellence**: High availability, horizontal scalability, zero-downtime deployment, and observability.
- **Data & AI Advantage**: In-house analytics, speech-to-text, sentiment, auto-QA, and future AI agent capabilities.

## 4. Solution Overview

The platform is a modular monolith architected for future microservice decomposition. It exposes a Next.js/React web application and a comprehensive NestJS API, backed by PostgreSQL, Redis/BullMQ, and a multi-tenant domain model. ViciDial/Asterisk handles only call signaling, media, and recording capture; all business logic lives in the in-house application layer.

### 4.1 Key Architecture Principles

- **Domain-Driven Design (DDD)**: Bounded contexts for Auth, Organization, Campaign, Lead, Dialer, Recording, Reporting, AI, and Integration.
- **Clean Architecture / Hexagonal / Ports & Adapters**: Core domain isolated from frameworks, databases, telephony engines, and UI.
- **CQRS**: Command and query separation for campaign mutation, lead imports, and reporting workloads.
- **Event-Driven Architecture**: Domain events propagate state changes across modules via Redis Pub/Sub and BullMQ.
- **Adapter Pattern**: Telephony Adapter Layer abstracts ViciDial, Asterisk ARI, FreeSWITCH, Twilio, Amazon Connect, Genesys Cloud, and SIP providers.

## 5. Scope

### In Scope

- Authentication, authorization, RBAC, multi-tenancy, organizations, departments, teams, users, agents, supervisors, admins.
- Campaign management, lead lists, CSV import, validation, assignment, recycling.
- Manual, preview, progressive, predictive, and power dialer modes.
- Voicemail/AMD detection, call recording, dispositions, callbacks, appointment scheduling.
- DNC management, caller ID rotation, time-zone and TCPA compliance.
- Live, historical, supervisor, admin, and agent dashboards.
- CRM integration layer, webhook engine, notification engine.
- Audit logs, activity timeline, recording storage/playback/download.
- API Gateway, AI modules (STT, summaries, sentiment, auto-QA, auto-disposition, real-time transcription, future AI agent support).

### Out of Scope (Future Releases)

- Inbound IVR/ACD (Phase 2).
- Workforce Management (Phase 2).
- Omnichannel messaging (Phase 3).
- Native mobile applications (Phase 3).

## 6. Technology Choices

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, React, TypeScript, TailwindCSS, Shadcn UI, TanStack Query, Zustand, Socket.IO Client, React Hook Form, Zod, Recharts |
| Backend | NestJS, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO, JWT, Passport, Swagger/OpenAPI |
| Telephony | ViciDial, Asterisk, SIP, Telnyx, Twilio Elastic SIP, SignalWire, DID routing, call recording |
| Infrastructure | Ubuntu Server, Docker, Docker Compose, Nginx, Cloudflare, Let's Encrypt, GitHub Actions |
| Monitoring | Grafana, Prometheus, Loki, Sentry, Node Exporter |
| Storage | AWS S3, MinIO-compatible storage |

## 7. Investment & Timeline Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| Foundation | 4–6 weeks | PRD, SRS, architecture, database, environment |
| Core Platform | 10–12 weeks | Auth, orgs, users, campaigns, leads, dialer |
| Telephony Integration | 6–8 weeks | Adapter, ViciDial integration, call flows |
| Reporting & Analytics | 6–8 weeks | Dashboards, reporting engine, analytics |
| AI & Compliance | 6–8 weeks | STT, sentiment, auto-QA, compliance |
| DevOps & Hardening | 4–6 weeks | CI/CD, monitoring, DR, security |
| Total | 36–48 weeks | MVP ready for production |

Team composition: 20–50 senior engineers across frontend, backend, telephony, DevOps, QA, security, data/AI, and product.

## 8. Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Telephony complexity | Adapter pattern isolates ViciDial; POC with Asterisk ARI and SIP providers |
| Compliance violations | Built-in TCPA/DNC/time-zone guards, audit logs, and policy engine |
| Scale bottlenecks | Horizontal scaling of API and dialer workers; Redis-backed queues |
| Talent ramp-up time | Clean architecture, DDD, and documented API contracts reduce onboarding |

## 9. Success Criteria

- 99.9% platform uptime in production.
- Sub-100ms p95 API latency for core operations.
- Replace telephony engine without frontend or business-logic changes.
- Process 1M+ leads per tenant per day.
- Support 5,000 concurrent agents per deployment.
- Zero compliance violations from dialing controls.

## 10. Recommendations

1. Approve the phased build approach described in this package.
2. Establish a dedicated Platform Architecture Review Board.
3. Begin with the adapter-layer proof of concept against ViciDial and at least one alternate SIP provider.
4. Adopt the coding standards and repository structure before any feature development.
5. Treat security, observability, and compliance as first-class architectural concerns, not afterthoughts.
