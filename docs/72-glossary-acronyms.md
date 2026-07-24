# 72 — Glossary & Acronyms

**Document Control**

| Property | Value |
|----------|-------|
| Title | Glossary & Acronyms |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Acronyms

| Acronym | Meaning |
|---------|---------|
| AC | Acceptance Criteria |
| ACD | Automatic Call Distribution |
| ADR | Architecture Decision Record |
| AGI | Asterisk Gateway Interface |
| AI | Artificial Intelligence |
| AMI | Asterisk Manager Interface |
| AMD | Answering Machine Detection |
| AOF | Append-Only File (Redis) |
| API | Application Programming Interface |
| ARI | Asterisk REST Interface |
| BRIN | Block Range Index (PostgreSQL) |
| BYOD | Bring Your Own Device |
| CDN | Content Delivery Network |
| CI/CD | Continuous Integration / Continuous Deployment |
| CQRS | Command Query Responsibility Segregation |
| CRM | Customer Relationship Management |
| CSP | Content Security Policy |
| CTA | Call to Action |
| CDR | Call Detail Record |
| CEL | Channel Event Log |
| DAST | Dynamic Application Security Testing |
| DDD | Domain-Driven Design |
| DID | Direct Inward Dialing |
| DLQ | Dead Letter Queue |
| DNC | Do Not Call |
| DTMF | Dual-Tone Multi-Frequency |
| DTLS | Datagram Transport Layer Security |
| E2E | End-to-End |
| E911 | Enhanced 911 |
| ESL | Event Socket Library (FreeSWITCH) |
| FCM | Firebase Cloud Messaging |
| FCP | First Contentful Paint |
| FQDN | Fully Qualified Domain Name |
| GDPR | General Data Protection Regulation |
| GHCR | GitHub Container Registry |
| GIN | Generalized Inverted Index (PostgreSQL) |
| GPU | Graphics Processing Unit |
| HA | High Availability |
| HMAC | Hash-based Message Authentication Code |
| HSM | Hardware Security Module |
| HTTP | Hypertext Transfer Protocol |
| HTTPS | HTTP Secure |
| IAC | Infrastructure as Code |
| ICP | Ideal Customer Profile |
| IdP | Identity Provider |
| IVR | Interactive Voice Response |
| JIT | Just-In-Time |
| JWT | JSON Web Token |
| KMS | Key Management Service |
| KPI | Key Performance Indicator |
| LLM | Large Language Model |
| Loki | Log aggregation system (Grafana) |
| LRU | Least Recently Used |
| MFA | Multi-Factor Authentication |
| ML | Machine Learning |
| MSW | Mock Service Worker |
| MVC | Model-View-Controller |
| NAT | Network Address Translation |
| NFR | Non-Functional Requirement |
| Nginx | Web server/reverse proxy |
| NPS | Net Promoter Score |
| OIDC | OpenID Connect |
| OLAP | Online Analytical Processing |
| ORM | Object-Relational Mapping |
| OWASP | Open Web Application Security Project |
| P0/P1/P2/P3 | Priority levels |
| PDF | Portable Document Format |
| PII | Personally Identifiable Information |
| PKCE | Proof Key for Code Exchange |
| POC | Proof of Concept |
| PRD | Product Requirements Document |
| Prometheus | Metrics collection system |
| PR | Pull Request |
| QA | Quality Assurance |
| RDB | Redis Database (snapshot) |
| RDS | Relational Database Service (AWS) |
| REST | Representational State Transfer |
| RLS | Row-Level Security |
| RPO | Recovery Point Objective |
| RTP | Real-Time Transport Protocol |
| RTO | Recovery Time Objective |
| RBAC | Role-Based Access Control |
| S3 | Simple Storage Service (AWS) |
| SAST | Static Application Security Testing |
| SBC | Session Border Controller |
| SCIM | System for Cross-domain Identity Management |
| SDK | Software Development Kit |
| SES | Simple Email Service (AWS) |
| SHA | Secure Hash Algorithm |
| SIP | Session Initiation Protocol |
| SLA | Service Level Agreement |
| SMS | Short Message Service |
| SMTP | Simple Mail Transfer Protocol |
| SOA | Service-Oriented Architecture |
| Socket.IO | Real-time communication library |
| SOLID | Object-oriented design principles |
| SRE | Site Reliability Engineering |
| SRTP | Secure Real-Time Transport Protocol |
| SSO | Single Sign-On |
| SRS | Software Requirements Specification |
| STT | Speech-to-Text |
| STUN | Session Traversal Utilities for NAT |
| TCPA | Telephone Consumer Protection Act |
| TDD | Test-Driven Development |
| TTI | Time to Interactive |
| TOTP | Time-Based One-Time Password |
| TLS | Transport Layer Security |
| TTS | Text-to-Speech |
| UI | User Interface |
| UML | Unified Modeling Language |
| URI | Uniform Resource Identifier |
| URL | Uniform Resource Locator |
| USB | Universal Serial Bus |
| UX | User Experience |
| VICI | ViciDial |
| VM | Virtual Machine |
| VoIP | Voice over IP |
| VPN | Virtual Private Network |
| WAF | Web Application Firewall |
| WFM | Workforce Management |
| WORM | Write Once Read Many |
| WS | WebSocket |
| WSS | WebSocket Secure |
| XSS | Cross-Site Scripting |
| Zod | TypeScript schema validation library |

## 2. Glossary

| Term | Definition |
|------|------------|
| Abandon Rate | The percentage of answered calls that are disconnected before reaching an agent. |
| Adapter Pattern | A structural design pattern that allows incompatible interfaces to work together. |
| Agent | A user authorized to make outbound calls. |
| Answering Machine Detection (AMD) | Technology that detects whether a live person or a machine answered a call. |
| Asterisk | An open-source PBX and telephony toolkit. |
| Bounded Context | A central pattern in DDD; a defined boundary within which a domain model applies. |
| Campaign | A configured outbound calling initiative with leads, schedules, and dialing rules. |
| Caller ID | The phone number presented to the called party. |
| Clean Architecture | An architectural approach that isolates business logic from frameworks, UI, and databases. |
| Concurrent Agent | An agent logged in and available or on a call at the same time. |
| Connection Rate | The percentage of dials that result in an answered call. |
| Dangling Call | A call that has lost its association with an agent or session. |
| Dialer | The system component that selects leads and initiates calls. |
| Disposition | The outcome classification applied to a call. |
| DNC | Do Not Call; a list of numbers that must not be called. |
| Domain Event | A significant business occurrence emitted by an aggregate root. |
| Event-Driven Architecture | An architecture where components communicate via events. |
| FreeSWITCH | An open-source telephony platform. |
| Genesys Cloud | A cloud contact center platform. |
| Lead | A contact record to be called within a campaign. |
| Lead List | A container of leads imported into a campaign. |
| Microservice-Ready Modular Monolith | A monolithic application organized into modules that can later become microservices. |
| MixMonitor | An Asterisk application for recording both call legs. |
| Multi-Tenancy | A software architecture where a single instance serves multiple tenants. |
| Next Best Action | A recommended action for an agent based on context and AI. |
| Object Storage | Storage architecture that manages data as objects (e.g., S3, MinIO). |
| Pacing | The rate at which the dialer places calls. |
| Predictive Dialer | A dialer that uses statistics to predict agent availability and call answer rates. |
| Preview Dialer | A dialer that presents lead information before the agent decides to call. |
| Progressive Dialer | A dialer that automatically dials the next lead when an agent is available. |
| Power Dialer | A dialer that dials multiple lines per available agent. |
| Quality Assurance (QA) | The process of evaluating calls against standards and rubrics. |
| RBAC | Role-Based Access Control; access management based on roles and permissions. |
| Recording | An audio capture of a call. |
| Recycle | To re-queue a lead for future dialing based on disposition. |
| Retention Policy | Rules governing how long data is kept before deletion or archival. |
| Role | A collection of permissions assigned to users. |
| Room (Socket.IO) | A channel for broadcasting events to a subset of clients. |
| SIP | Session Initiation Protocol; signaling protocol for voice/video calls. |
| SIP Trunk | A virtual phone line using SIP to connect to a carrier. |
| Softphone | Software that enables voice calls over the internet. |
| Supervisor | A user who monitors and coaches agents. |
| TCPA | US law regulating telemarketing calls, texts, and faxes. |
| Telephony Adapter | The abstraction layer that isolates the application from telephony engines. |
| Tenant | An isolated organizational boundary within the platform. |
| Timezone Compliance | Ensuring calls are made only within allowed local time windows. |
| Transfer | Moving a call to another agent, queue, or external number. |
| ViciDial | An open-source call center suite based on Asterisk. |
| Voicemail Detection | Detection of voicemail or answering machines. |
| WebRTC | A technology for real-time communication in browsers. |
| WebSocket | A protocol providing full-duplex communication over a single TCP connection. |
| Wrap-Up | Time after a call for an agent to complete notes and post-call work. |
