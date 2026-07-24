# 64 — Sprint Planning

**Document Control**

| Property | Value |
|----------|-------|
| Title | Sprint Planning |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document provides a sprint planning framework for the RDCS In-House Dialer Platform. It is designed for a 20–50 person engineering team organized into feature squads and platform teams.

## 2. Team Structure

| Squad | Focus | Size |
|-------|-------|------|
| Auth & Platform | Authentication, RBAC, multi-tenancy, users, admin | 4–6 |
| Campaign & Leads | Campaigns, lead lists, imports, compliance | 5–7 |
| Dialer & Telephony | Dialer engine, telephony adapter, call handling | 5–8 |
| Reporting & Analytics | Dashboards, reports, analytics | 4–6 |
| AI & Quality | STT, summaries, sentiment, QA, recordings | 4–6 |
| Integrations | Webhooks, CRM connectors, API | 3–5 |
| Frontend & UX | Next.js app, components, dashboards | 5–8 |
| DevOps & Platform | Infrastructure, CI/CD, monitoring, security | 4–6 |
| QA & Test Automation | Test strategy, automation, performance | 3–5 |

## 3. Sprint Cadence

- **Duration**: 2 weeks.
- **Sprint Planning**: 4 hours at start.
- **Daily Standup**: 15 minutes per squad.
- **Sprint Review**: 2 hours at end.
- **Sprint Retrospective**: 1.5 hours.
- **Backlog Refinement**: 1 hour mid-sprint.

## 4. Sprint Planning Process

1. Review product roadmap and priorities.
2. Review team capacity and vacations.
3. Refine top backlog items.
4. Estimate using story points (Fibonacci: 1, 2, 3, 5, 8, 13, 21).
5. Commit to sprint goal.
6. Assign stories to squads and owners.
7. Identify dependencies and risks.
8. Define acceptance criteria and test plans.

## 5. Definition of Ready

A backlog item is ready for sprint when it has:
- Clear user story and acceptance criteria.
- UI/UX design or wireframe (if applicable).
- API contract or DTOs defined.
- Database schema changes documented.
- Dependencies identified.
- Estimation completed.
- No unresolved blockers.

## 6. Definition of Done

A story is done when:
- Code implemented and reviewed.
- Unit tests passing with adequate coverage.
- Integration tests added/updated.
- E2E tests added for critical paths.
- Documentation updated (API docs, runbooks if needed).
- Security review completed (if applicable).
- QA validated in staging.
- No critical bugs open.
- Merged to main/develop.

## 7. Sprint Backlog Example

### Sprint 1 — Foundation

| Story | Squad | Points |
|-------|-------|--------|
| Set up NestJS monorepo and CI/CD | Platform | 8 |
| Implement user registration and login | Auth | 8 |
| Define Prisma schema for tenants, users, roles | Auth + Platform | 5 |
| Create Next.js app shell and routing | Frontend | 5 |
| Set up Docker Compose dev environment | DevOps | 8 |
| Implement RBAC permission model | Auth | 8 |
| Deploy staging environment | DevOps | 8 |

### Sprint 2 — Organization & Campaign

| Story | Squad | Points |
|-------|-------|--------|
| Implement organization hierarchy | Auth | 5 |
| Create campaign CRUD API | Campaign | 8 |
| Create campaign UI wizard | Frontend | 8 |
| Implement campaign schedules and timezone | Campaign | 5 |
| Add caller ID and disposition management | Campaign | 5 |
| Write campaign activation logic | Campaign | 5 |

### Sprint 3 — Leads & Import

| Story | Squad | Points |
|-------|-------|--------|
| Implement lead list and lead CRUD | Leads | 8 |
| CSV import with validation | Leads | 13 |
| DNC scrubbing engine | Compliance | 8 |
| Lead assignment rules | Leads | 8 |
| Lead UI list and detail pages | Frontend | 8 |

### Sprint 4 — Dialer & Telephony Adapter

| Story | Squad | Points |
|-------|-------|--------|
| Define ITelephonyAdapter interface | Telephony | 5 |
| Implement ViciDial/Asterisk adapter | Telephony | 13 |
| Implement agent state management | Dialer | 8 |
| Implement manual dialer | Dialer | 8 |
| Implement call state machine | Dialer | 8 |
| Agent dashboard UI | Frontend | 8 |

### Sprint 5 — Call Handling & Dispositions

| Story | Squad | Points |
|-------|-------|--------|
| Implement disposition setting | Dialer | 5 |
| Callback scheduling | Dialer | 5 |
| Call controls (hold, mute, transfer) | Telephony | 8 |
| Call recording start/stop | Telephony | 8 |
| Supervisor listen/barge | Telephony | 8 |
| Call history UI | Frontend | 5 |

### Sprint 6 — Reporting & Dashboards

| Story | Squad | Points |
|-------|-------|--------|
| Implement live dashboard metrics | Reporting | 8 |
| Historical report API | Reporting | 8 |
| Campaign and agent performance reports | Reporting | 8 |
| Dashboard UI with charts | Frontend | 8 |
| Export engine | Reporting | 8 |

### Sprint 7 — Compliance & CRM

| Story | Squad | Points |
|-------|-------|--------|
| Implement compliance reports | Compliance | 5 |
| Abandon rate guard | Compliance + Dialer | 8 |
| Webhook engine | Integrations | 8 |
| CRM API and connector framework | Integrations | 8 |
| Notification engine | Integrations | 5 |

### Sprint 8 — AI & QA

| Story | Squad | Points |
|-------|-------|--------|
| Integrate STT adapter | AI | 8 |
| Generate call summaries | AI | 5 |
| Sentiment analysis | AI | 5 |
| Auto-QA scoring | AI | 8 |
| QA dashboard UI | Frontend + AI | 8 |
| Recording library and playback | Frontend | 5 |

### Sprint 9 — DevOps & Hardening

| Story | Squad | Points |
|-------|-------|--------|
| Production environment setup | DevOps | 8 |
| Implement monitoring and alerting | DevOps | 8 |
| Security hardening and penetration test | Security | 13 |
| Backup and DR setup | DevOps | 8 |
| Performance testing and optimization | QA + DevOps | 8 |
| Production checklist completion | All | 5 |

## 8. Dependency Management

- Identify cross-squad dependencies during sprint planning.
- Use API contracts and stubs to unblock parallel work.
- Weekly cross-squad sync meeting.
- Track dependencies on a shared board.

## 9. Risk Management

- Flag high-risk items early.
- Allocate spike stories for unknowns (e.g., ViciDial adapter behavior, STT accuracy).
- Maintain a technical debt backlog.
- Escalate blockers within 24 hours.

## 10. Metrics

- Velocity per squad.
- Sprint completion rate.
- Defect escape rate.
- Cycle time.
- Test coverage trend.
- Deployment frequency.

## 11. Tooling

- Project management: Jira / Linear / GitHub Projects.
- Source control: GitHub.
- CI/CD: GitHub Actions.
- Documentation: Confluence / Notion / GitHub Wiki.
- Communication: Slack.
- Design: Figma.

## 12. Scaling the Team

- Onboarding guide for new engineers.
- Clean architecture and DDD documentation reduce ramp-up time.
- Code review and pair programming encouraged.
- Regular architecture decision records (ADRs).
