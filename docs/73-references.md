# 73 — References

**Document Control**

| Property | Value |
|----------|-------|
| Title | References |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. External References

### 1.1 Technology Documentation

| Reference | URL |
|-----------|-----|
| NestJS Documentation | https://docs.nestjs.com |
| Next.js Documentation | https://nextjs.org/docs |
| React Documentation | https://react.dev |
| Prisma Documentation | https://www.prisma.io/docs |
| PostgreSQL Documentation | https://www.postgresql.org/docs/ |
| Redis Documentation | https://redis.io/documentation |
| BullMQ Documentation | https://docs.bullmq.io |
| Socket.IO Documentation | https://socket.io/docs/v4 |
| TailwindCSS Documentation | https://tailwindcss.com/docs |
| Shadcn UI | https://ui.shadcn.com |
| TanStack Query | https://tanstack.com/query/latest |
| Zod Documentation | https://zod.dev |
| Swagger/OpenAPI | https://swagger.io/specification/ |
| Asterisk Documentation | https://docs.asterisk.org |
| ViciDial Documentation | https://www.vicidial.org/docs.html |
| Grafana Documentation | https://grafana.com/docs |
| Prometheus Documentation | https://prometheus.io/docs |
| Loki Documentation | https://grafana.com/docs/loki/latest |
| Sentry Documentation | https://docs.sentry.io |
| Docker Documentation | https://docs.docker.com |
| Cloudflare Documentation | https://developers.cloudflare.com |
| Let's Encrypt | https://letsencrypt.org/docs |
| MinIO Documentation | https://min.io/docs |
| GitHub Actions | https://docs.github.com/en/actions |

### 1.2 Standards & Best Practices

| Reference | URL |
|-----------|-----|
| OWASP Top 10 | https://owasp.org/www-project-top-ten/ |
| OWASP Cheat Sheet Series | https://cheatsheetseries.owasp.org |
| NIST Cybersecurity Framework | https://www.nist.gov/cyberframework |
| ISO 27001 Information Security | https://www.iso.org/isoiec-27001-information-security.html |
| PCI DSS (if applicable) | https://www.pcisecuritystandards.org |
| GDPR | https://gdpr.eu |
| TCPA Regulations | https://www.fcc.gov/general/telemarketing-and-robocalls |
| WCAG 2.1 | https://www.w3.org/WAI/WCAG21/quickref/ |
| Conventional Commits | https://www.conventionalcommits.org |
| Semantic Versioning | https://semver.org |

### 1.3 Architecture & Design Patterns

| Reference | Description |
|-----------|-------------|
| Domain-Driven Design by Eric Evans | Foundational DDD text |
| Implementing Domain-Driven Design by Vaughn Vernon | DDD implementation guidance |
| Clean Architecture by Robert C. Martin | Clean/hexagonal architecture |
| Patterns of Enterprise Application Architecture by Martin Fowler | Enterprise patterns |
| Designing Data-Intensive Applications by Martin Kleppmann | Data systems design |
| Building Microservices by Sam Newman | Microservices patterns |
| The Twelve-Factor App | https://12factor.net |
| CQRS Pattern | Microsoft Azure Architecture Center |
| Event Sourcing | Microsoft Azure Architecture Center |
| Repository Pattern | Microsoft .NET Architecture Guides |

## 2. Internal Documents

The following documents are part of this architecture package and are referenced throughout:

- `00-master-index.md`
- `01-executive-summary.md`
- `02-product-requirements-document.md`
- `03-software-requirements-specification.md`
- `04-functional-requirements.md`
- `05-non-functional-requirements.md`
- `06-business-rules.md`
- `07-user-personas.md`
- `08-user-stories.md`
- `09-permission-matrix.md`
- `10-dashboard-specifications.md`
- `11-ux-navigation.md`
- `12-information-architecture.md`
- `13-frontend-architecture.md`
- `14-backend-architecture.md`
- `15-domain-driven-design.md`
- `16-module-dependency-diagram.md`
- `17-clean-architecture-layers.md`
- `18-infrastructure-architecture.md`
- `19-network-architecture.md`
- `20-reverse-proxy-architecture.md`
- `21-docker-architecture.md`
- `22-docker-compose.md`
- `23-ci-cd-pipeline.md`
- `24-telephony-architecture.md`
- `25-asterisk-call-flow.md`
- `26-vicidial-integration-layer.md`
- `27-adapter-pattern-design.md`
- `28-event-driven-architecture.md`
- `29-queue-architecture.md`
- `30-redis-design.md`
- `31-database-design.md`
- `32-er-diagram.md`
- `33-database-tables.md`
- `34-index-strategy.md`
- `35-partition-strategy.md`
- `36-prisma-schema-design.md`
- `37-api-gateway.md`
- `38-authentication-flow.md`
- `39-authorization-flow.md`
- `40-rest-api-documentation.md`
- `41-websocket-api-documentation.md`
- `42-internal-event-documentation.md`
- `43-webhook-events.md`
- `44-notification-flow.md`
- `45-recording-flow.md`
- `46-call-flow.md`
- `47-dialing-flow.md`
- `48-campaign-flow.md`
- `49-lead-lifecycle.md`
- `50-reporting-engine.md`
- `51-analytics-engine.md`
- `52-ai-architecture.md`
- `53-security-architecture.md`
- `54-encryption-strategy.md`
- `55-secrets-management.md`
- `56-monitoring.md`
- `57-logging.md`
- `58-disaster-recovery.md`
- `59-backup-strategy.md`
- `60-production-checklist.md`
- `61-testing-strategy.md`
- `62-deployment-strategy.md`
- `63-github-actions.md`
- `64-sprint-planning.md`
- `65-development-timeline.md`
- `66-future-roadmap.md`
- `67-coding-standards.md`
- `68-folder-structure.md`
- `69-naming-conventions.md`
- `70-error-handling.md`
- `71-api-versioning.md`
- `72-glossary-acronyms.md`
- `73-references.md`

## 3. Vendor & Carrier Contacts

Carrier and vendor contact information maintained separately in secure operations runbook (not included in this document for security reasons).

## 4. Training Resources

- Internal onboarding guide (to be developed).
- Architecture Decision Records (ADRs) — repository to be maintained.
- Team wiki and runbooks.
- External training for NestJS, React, Prisma, Asterisk as needed.

## 5. Relevant RFCs & Specifications

| RFC | Title |
|-----|-------|
| RFC 3261 | SIP: Session Initiation Protocol |
| RFC 3550 | RTP: A Transport Protocol for Real-Time Applications |
| RFC 4566 | SDP: Session Description Protocol |
| RFC 5245 | ICE: Interactive Connectivity Establishment |
| RFC 5389 | STUN: Session Traversal Utilities for NAT |
| RFC 5766 | TURN: Traversal Using Relays around NAT |
| RFC 6347 | DTLS: Datagram Transport Layer Security |
| RFC 6188 | SRTP: Security Considerations |
| RFC 7519 | JWT: JSON Web Token |
| RFC 7642 | SCIM: Definitions |

## 6. Tools & Libraries

| Category | Tools |
|----------|-------|
| Frontend | Next.js, React, TypeScript, TailwindCSS, Shadcn UI, TanStack Query, Zustand, Socket.IO Client, React Hook Form, Zod, Recharts, Lucide React, Vitest, Playwright |
| Backend | NestJS, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO, Passport, JWT, class-validator/Zod, Jest, Supertest, Testcontainers |
| Telephony | ViciDial, Asterisk, SIP, Telnyx, Twilio Elastic SIP, SignalWire |
| Infrastructure | Ubuntu, Docker, Docker Compose, Nginx, Cloudflare, Let's Encrypt, GitHub Actions |
| Monitoring | Grafana, Prometheus, Loki, Sentry, Node Exporter, Promtail |
| Storage | AWS S3, MinIO |
| Security | HashiCorp Vault, OWASP tools, Trivy, CodeQL, SonarQube, Snyk |
