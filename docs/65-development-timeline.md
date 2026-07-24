# 65 — Development Timeline

**Document Control**

| Property | Value |
|----------|-------|
| Title | Development Timeline |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document outlines the development timeline for the RDCS In-House Dialer Platform. The timeline is organized into phases with estimated durations and major milestones.

## 2. Assumptions

- Team of 20–30 senior engineers across squads.
- 2-week sprints.
- Some work parallelized across squads.
- External dependencies (ViciDial setup, carrier contracts) resolved in parallel.
- Initial target: MVP ready for production in 36–48 weeks.

## 3. Phase Overview

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|----------------|
| Phase 0: Foundation | 4–6 weeks | Architecture, environment, scaffolding | Architecture docs, CI/CD, dev environment, schema |
| Phase 1: Identity & Platform | 6–8 weeks | Auth, RBAC, multi-tenancy, org hierarchy | Login, roles, tenants, users, admin UI |
| Phase 2: Campaign & Leads | 8–10 weeks | Campaigns, lead lists, CSV import, compliance | Campaign wizard, import, DNC, lead UI |
| Phase 3: Dialer & Telephony | 8–10 weeks | Adapter, ViciDial integration, dialer modes | Manual/preview/progressive dialer, call state |
| Phase 4: Call Handling & Recording | 6–8 weeks | Dispositions, callbacks, transfers, recording | Call controls, recording, supervisor features |
| Phase 5: Reporting & Analytics | 6–8 weeks | Dashboards, reports, analytics engine | Live/historical dashboards, exports |
| Phase 6: Integrations & Notifications | 4–6 weeks | Webhooks, CRM, notifications | Webhook engine, CRM connectors, alerts |
| Phase 7: AI & Quality | 6–8 weeks | STT, summaries, sentiment, QA | AI modules, QA dashboard |
| Phase 8: DevOps & Hardening | 6–8 weeks | Production, monitoring, security, DR | Production environment, security audit, DR |
| **Total** | **48–68 weeks** | | |

## 4. Detailed Timeline

### Phase 0: Foundation (Weeks 1–6)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 1–2 | Finalize architecture, set up repos, CI/CD skeleton | Architecture approval, GitHub repos, base CI |
| 3–4 | Set up Docker Compose dev environment, Prisma schema, base NestJS/Next.js apps | Running local stack, initial schema |
| 5–6 | Define API conventions, DDD structure, common libraries, seed data | Project conventions, shared packages, seed scripts |

### Phase 1: Identity & Platform (Weeks 7–14)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 7–8 | Implement JWT auth, login/register, password reset, sessions | Auth API, login UI |
| 9–10 | Implement RBAC, roles, permissions, tenant isolation | RBAC engine, permission matrix |
| 11–12 | Implement tenants, organizations, departments, teams, user management | Admin UI for org/user mgmt |
| 13–14 | MFA, SSO (SAML/OIDC), audit logging, activity timeline | Enterprise auth, audit logs |

### Phase 2: Campaign & Leads (Weeks 15–24)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 15–17 | Campaign CRUD, lifecycle, schedules, caller IDs, dispositions | Campaign UI/API |
| 18–20 | Lead lists, CSV import, validation, deduplication | Import wizard, lead list UI |
| 21–22 | DNC lists, scrubbing, timezone compliance, lead assignment | Compliance engine |
| 23–24 | Lead recycling, lead search, bulk actions, lead UI | Lead management complete |

### Phase 3: Dialer & Telephony (Weeks 25–34)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 25–27 | Define telephony adapter interface, implement ViciDial adapter | Adapter layer, AMI integration |
| 28–30 | Agent state management, manual dialer, preview dialer, progressive dialer | Agent dashboard dialer |
| 31–32 | Power dialer, predictive dialer, pacing algorithm | Advanced dialer modes |
| 33–34 | Call state machine, adapter event handling, AMD integration | Robust call handling |

### Phase 4: Call Handling & Recording (Weeks 35–42)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 35–36 | Dispositions, callbacks, call notes, tags | Call outcome management |
| 37–38 | Hold, mute, transfer, conference | Call controls |
| 39–40 | Recording start/stop/pause, upload, playback, download | Recording module |
| 41–42 | Supervisor listen, whisper, barge, real-time monitor | Supervisor features |

### Phase 5: Reporting & Analytics (Weeks 43–50)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 43–45 | Live dashboard, real-time metrics, Redis aggregation | Live dashboard |
| 46–48 | Historical reports, materialized views, export engine | Reporting module |
| 49–50 | Campaign/analytics dashboards, scheduled reports | Analytics engine |

### Phase 6: Integrations & Notifications (Weeks 51–56)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 51–52 | Webhook engine, subscriptions, retries, HMAC | Webhooks |
| 53–54 | CRM integration framework, API keys, connectors | CRM integration |
| 55–56 | Notification engine, templates, preferences, in-app/email/SMS | Notifications |

### Phase 7: AI & Quality (Weeks 57–64)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 57–58 | Recording storage, playback library, QA rubrics | QA foundation |
| 59–60 | STT integration, transcript storage, search | Transcription |
| 61–62 | Call summaries, sentiment analysis, auto-QA | AI features |
| 63–64 | Real-time transcription, AI dashboard | Advanced AI |

### Phase 8: DevOps & Hardening (Weeks 65–72)

| Week | Activities | Deliverables |
|------|------------|--------------|
| 65–66 | Production environment setup, monitoring, alerting | Production-ready infra |
| 67–68 | Security hardening, penetration testing, compliance validation | Security audit pass |
| 69–70 | Backup, DR setup, runbooks, load testing | DR ready |
| 71–72 | Production checklist, soft launch, pilot users, bug fixes | Production launch |

## 5. Milestones

| Milestone | Target Week | Success Criteria |
|-----------|-------------|-------------------|
| Architecture approved | Week 2 | PRD, SRS, architecture docs signed off |
| Local dev stack ready | Week 4 | Docker Compose runs all services |
| Alpha login & users | Week 10 | Users can register, login, manage roles |
| Beta campaigns & leads | Week 22 | Campaigns can be created and leads imported |
| First call | Week 30 | Agent can make a manual call via dialer |
| Dialer complete | Week 38 | All dialing modes working, call controls stable |
| Reporting live | Week 48 | Dashboards and reports functional |
| Integration ready | Week 54 | Webhooks and CRM sync working |
| AI features ready | Week 64 | STT, summaries, QA operational |
| Production launch | Week 72 | Platform live for production tenants |

## 6. Critical Path

The critical path runs through:
- Foundation → Identity → Campaigns → Leads → Telephony Adapter → Manual Dialer → Call State → Recording → Dashboards → Production Hardening.

Parallel tracks:
- AI/QA can proceed once recording is stable.
- Integrations/webhooks can proceed once core API and events are stable.
- DevOps/infrastructure work runs throughout.

## 7. Risk Adjustments

- Telephony adapter complexity: add 2–4 weeks buffer.
- ViciDial/Asterisk integration issues: spike in Phase 3.
- STT accuracy/performance: evaluate local vs. cloud options early.
- Compliance validation: engage legal/compliance team by Phase 2.
- Team ramp-up: first 2 sprints may have lower velocity.

## 8. Budget Implications

- Timeline assumes 20–30 engineers.
- Costs scale with team size and infrastructure (cloud/telephony).
- Carrier contracts and SIP trunks procured in Phase 2–3.
- External STT/AI services evaluated in Phase 7.

## 9. Release Planning

- Internal alpha: Week 14.
- Internal beta: Week 30.
- Pilot launch with friendly tenant: Week 60.
- General production availability: Week 72.

## 10. Post-Launch

- Continuous improvement sprints.
- Performance optimization based on production metrics.
- Feature expansion per roadmap.
- Regular security and compliance reviews.
