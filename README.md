# RDCS In-House Dialer Platform

## Enterprise Architecture & Engineering Implementation Package

This repository contains the complete enterprise architecture, engineering specification, and implementation guidance for the **RDCS In-House Dialer Platform**.

### Package Contents

All documents are in the `docs/` directory, organized into 11 phases:

1. **Product Foundation** — Executive Summary, PRD, SRS, functional and non-functional requirements, business rules.
2. **User Experience & Design** — Personas, user stories, permission matrix, dashboard specs, navigation, information architecture.
3. **Application Architecture** — Frontend, backend, DDD, module dependencies, clean architecture layers.
4. **Infrastructure & Network** — Infrastructure, network, reverse proxy, Docker, CI/CD.
5. **Telephony** — Telephony architecture, Asterisk call flow, ViciDial integration, adapter pattern.
6. **Data & Messaging** — Event-driven architecture, queues, Redis, database design, ER diagram, Prisma schema.
7. **API & Integration** — API gateway, authentication, authorization, REST/WebSocket docs, events, webhooks, notifications.
8. **Domain Flows** — Recording, call, dialing, campaign, lead lifecycle, reporting, analytics, AI.
9. **Security & Operations** — Security, encryption, secrets, monitoring, logging, DR, backup, production checklist.
10. **Quality & Delivery** — Testing, deployment, GitHub Actions, sprint planning, timeline, roadmap.
11. **Engineering Standards** — Coding standards, folder structure, naming conventions, error handling, API versioning, glossary, references.

### Generating the Merged Word Document

To generate a single merged Microsoft Word (.docx) version of the package:

1. Install Pandoc: https://pandoc.org/installing.html
2. Install Python dependencies:

   ```bash
   pip install -r scripts/requirements.txt
   ```

3. Run the generator:

   ```bash
   python scripts/generate-docx.py
   ```

4. Open `RDCS-In-House-Dialer-Platform.docx` in the project root.

### Document Control

| Property | Value |
|----------|-------|
| Project Name | RDCS In-House Dialer Platform |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 21-Jul-2026 |
| Classification | Internal – Engineering Use |

### Key Design Principles

- **ViciDial as telephony engine only**: all business logic is developed in-house.
- **Telephony Adapter Pattern**: isolates ViciDial so it can be replaced with Asterisk ARI, FreeSWITCH, Twilio, Amazon Connect, Genesys Cloud, or any SIP provider.
- **Domain-Driven Design (DDD)** with Clean Architecture, SOLID, CQRS, Repository Pattern, and Event-Driven Architecture.
- **Microservice-ready modular monolith**: modules can be decomposed into microservices later.
- **Multi-tenancy, RBAC, compliance, and observability** built in from day one.

### Contact

For questions or updates, contact the Enterprise Architecture Team.
