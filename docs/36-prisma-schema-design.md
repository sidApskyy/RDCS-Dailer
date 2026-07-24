# 36 — Prisma Schema Design

**Document Control**

| Property | Value |
|----------|-------|
| Title | Prisma Schema Design |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the Prisma schema design for the RDCS In-House Dialer Platform. Prisma is the ORM used for database access, schema definition, and migrations.

## 2. Schema Organization

The `schema.prisma` file is organized into sections by domain:

- Core models (tenants, users, roles, permissions, sessions)
- Organization models (organizations, departments, teams)
- Campaign models (campaigns, schedules, caller IDs, dispositions)
- Lead models (lead lists, leads, phones, custom fields)
- DNC models (lists, entries, matches)
- Call models (calls, events, callbacks, notes, tags)
- Recording models (recordings, transcripts, summaries, sentiments, QA)
- Integration models (integrations, webhooks, deliveries)
- Notification and audit models
- System and settings models

## 3. Prisma Configuration

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// For read replicas, use connection pooling or a separate Prisma client
```

## 4. Core Models

```prisma
model Tenant {
  id            String    @id @default(uuid()) @db.Uuid
  name          String    @db.VarChar(255)
  slug          String    @unique @db.VarChar(100)
  status        String    @db.VarChar(20)
  region        String?   @db.VarChar(50)
  timezone      String    @db.VarChar(50)
  settings      Json?     @default("{}")
  branding      Json?     @default("{}")
  createdAt     DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime  @updatedAt @db.Timestamptz(6)
  createdBy     String?   @db.Uuid
  updatedBy     String?   @db.Uuid
  deletedAt     DateTime? @db.Timestamptz(6)
  deletedBy     String?   @db.Uuid
  version       Int       @default(1)

  organizations Organization[]
  users         User[]
  campaigns     Campaign[]
  dncLists      DncList[]
  audits        Audit[]
  settings      Setting[]

  @@index([status])
  @@map("tenants")
}

model User {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @db.Uuid
  email           String    @db.VarChar(255)
  passwordHash    String?   @db.VarChar(255)
  firstName       String    @db.VarChar(100)
  lastName        String    @db.VarChar(100)
  status          String    @db.VarChar(20)
  mfaEnabled      Boolean   @default(false)
  mfaSecret       String?   @db.VarChar(255)
  lastLoginAt     DateTime? @db.Timestamptz(6)
  emailVerifiedAt DateTime? @db.Timestamptz(6)
  avatarUrl       String?   @db.VarChar(500)
  metadata        Json?     @default("{}")
  createdAt       DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime  @updatedAt @db.Timestamptz(6)
  createdBy       String?   @db.Uuid
  updatedBy       String?   @db.Uuid
  deletedAt       DateTime? @db.Timestamptz(6)
  deletedBy       String?   @db.Uuid
  version         Int       @default(1)

  tenant    Tenant    @relation(fields: [tenantId], references: [id])
  userRoles UserRole[]
  sessions  Session[]
  teamMembers TeamMember[]
  calls     Call[]

  @@unique([tenantId, email])
  @@index([tenantId, status])
  @@index([tenantId, lastLoginAt])
  @@map("users")
}

model Role {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String?   @db.Uuid
  name        String    @db.VarChar(100)
  description String?   @db.Text
  isSystem    Boolean   @default(false)
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)
  deletedAt   DateTime? @db.Timestamptz(6)
  version     Int       @default(1)

  userRoles UserRole[]
  rolePermissions RolePermission[]

  @@index([tenantId])
  @@map("roles")
}

model Permission {
  id          String    @id @default(uuid()) @db.Uuid
  resource    String    @db.VarChar(50)
  action      String    @db.VarChar(50)
  scope       String    @db.VarChar(20)
  description String?   @db.Text

  rolePermissions RolePermission[]

  @@unique([resource, action, scope])
  @@map("permissions")
}

model UserRole {
  userId     String    @db.Uuid
  roleId     String    @db.Uuid
  assignedAt DateTime  @default(now()) @db.Timestamptz(6)
  assignedBy String?   @db.Uuid

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}

model RolePermission {
  roleId       String @db.Uuid
  permissionId String @db.Uuid

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model Session {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  userId           String    @db.Uuid
  refreshTokenHash String    @db.VarChar(255)
  ipAddress        String?   @db.VarChar(45)
  userAgent        String?   @db.Text
  expiresAt        DateTime  @db.Timestamptz(6)
  lastActivityAt   DateTime  @default(now()) @db.Timestamptz(6)
  createdAt        DateTime  @default(now()) @db.Timestamptz(6)
  revokedAt        DateTime? @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, userId])
  @@index([refreshTokenHash])
  @@map("sessions")
}
```

## 5. Organization Models

```prisma
model Organization {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid
  name      String    @db.VarChar(255)
  code      String    @db.VarChar(50)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)
  deletedAt DateTime? @db.Timestamptz(6)
  version   Int       @default(1)

  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  departments Department[]

  @@unique([tenantId, code])
  @@map("organizations")
}

model Department {
  id             String    @id @default(uuid()) @db.Uuid
  tenantId       String    @db.Uuid
  organizationId String    @db.Uuid
  name           String    @db.VarChar(255)
  code           String    @db.VarChar(50)
  createdAt      DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt      DateTime  @updatedAt @db.Timestamptz(6)
  deletedAt      DateTime? @db.Timestamptz(6)
  version        Int       @default(1)

  organization Organization @relation(fields: [organizationId], references: [id])
  teams        Team[]
  campaigns    Campaign[]

  @@unique([organizationId, code])
  @@map("departments")
}

model Team {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  departmentId String    @db.Uuid
  name         String    @db.VarChar(255)
  code         String    @db.VarChar(50)
  createdAt    DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @db.Timestamptz(6)
  deletedAt    DateTime? @db.Timestamptz(6)
  version      Int       @default(1)

  department  Department   @relation(fields: [departmentId], references: [id])
  teamMembers TeamMember[]
  leads       Lead[]

  @@unique([departmentId, code])
  @@map("teams")
}

model TeamMember {
  teamId       String    @db.Uuid
  userId       String    @db.Uuid
  isSupervisor Boolean   @default(false)
  joinedAt     DateTime  @default(now()) @db.Timestamptz(6)

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
  @@map("team_members")
}
```

## 6. Campaign Models

```prisma
model Campaign {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  organizationId   String?   @db.Uuid
  departmentId     String?   @db.Uuid
  name             String    @db.VarChar(255)
  description      String?   @db.Text
  mode             String    @db.VarChar(20)
  status           String    @db.VarChar(20)
  timezone         String    @db.VarChar(50)
  pacingConfig     Json?     @default("{}")
  complianceConfig Json?     @default("{}")
  createdAt        DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime  @updatedAt @db.Timestamptz(6)
  createdBy        String?   @db.Uuid
  updatedBy        String?   @db.Uuid
  deletedAt        DateTime? @db.Timestamptz(6)
  deletedBy        String?   @db.Uuid
  version          Int       @default(1)

  tenant           Tenant                @relation(fields: [tenantId], references: [id])
  organization     Organization?         @relation(fields: [organizationId], references: [id])
  department       Department?           @relation(fields: [departmentId], references: [id])
  leadLists        LeadList[]
  calls            Call[]
  campaignCallerIds CampaignCallerId[]
  campaignDispositions CampaignDisposition[]
  campaignSchedules CampaignSchedule[]

  @@index([tenantId, status])
  @@index([tenantId, departmentId])
  @@index([tenantId, mode])
  @@map("campaigns")
}

model CampaignSchedule {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @db.Uuid
  campaignId String    @db.Uuid
  dayOfWeek  Int       @db.SmallInt
  startTime  String    @db.VarChar(8)
  endTime    String    @db.VarChar(8)
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @db.Timestamptz(6)

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([tenantId, campaignId])
  @@map("campaign_schedules")
}

model CampaignCallerId {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  campaignId       String    @db.Uuid
  phoneNumber      String    @db.VarChar(20)
  label            String?   @db.VarChar(100)
  isActive         Boolean   @default(true)
  reputationStatus String    @default("good") @db.VarChar(20)
  rotationOrder    Int       @default(0)
  createdAt        DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime  @updatedAt @db.Timestamptz(6)

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([tenantId, campaignId])
  @@map("campaign_caller_ids")
}

model CampaignDisposition {
  id                  String    @id @default(uuid()) @db.Uuid
  tenantId            String    @db.Uuid
  campaignId          String    @db.Uuid
  code                String    @db.VarChar(50)
  label               String    @db.VarChar(100)
  category            String    @db.VarChar(30)
  isTerminal          Boolean   @default(false)
  requiresCallback    Boolean   @default(false)
  requiresNotes       Boolean   @default(false)
  isRecyclable        Boolean   @default(false)
  recycleAfterMinutes Int?
  maxRecycleAttempts  Int?
  createdAt           DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt           DateTime  @updatedAt @db.Timestamptz(6)

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([tenantId, campaignId])
  @@map("campaign_dispositions")
}
```

## 7. Lead Models

```prisma
model LeadList {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid
  campaignId    String    @db.Uuid
  name          String    @db.VarChar(255)
  source        String?   @db.VarChar(100)
  importStatus  String    @default("pending") @db.VarChar(20)
  totalRows     Int?
  validRows     Int?
  invalidRows   Int?
  dncRows       Int?
  duplicateRows Int?
  mapping       Json?     @default("{}")
  createdAt     DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime  @updatedAt @db.Timestamptz(6)
  createdBy     String?   @db.Uuid
  updatedBy     String?   @db.Uuid
  deletedAt     DateTime? @db.Timestamptz(6)
  deletedBy     String?   @db.Uuid
  version       Int       @default(1)

  campaign Campaign @relation(fields: [campaignId], references: [id])
  leads    Lead[]

  @@index([tenantId, campaignId])
  @@map("lead_lists")
}

model Lead {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  campaignId       String    @db.Uuid
  leadListId       String?   @db.Uuid
  externalId       String?   @db.VarChar(100)
  firstName        String?   @db.VarChar(100)
  lastName         String?   @db.VarChar(100)
  email            String?   @db.VarChar(255)
  timezone         String    @db.VarChar(50)
  status           String    @db.VarChar(30)
  assignedToUserId String?   @db.Uuid
  assignedToTeamId String?   @db.Uuid
  priority         Int       @default(0)
  customFields     Json?     @default("{}")
  dncCheckedAt     DateTime? @db.Timestamptz(6)
  lastDialedAt     DateTime? @db.Timestamptz(6)
  dialAttempts     Int       @default(0)
  recycleAttempts  Int       @default(0)
  createdAt        DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime  @updatedAt @db.Timestamptz(6)
  createdBy        String?   @db.Uuid
  updatedBy        String?   @db.Uuid
  deletedAt        DateTime? @db.Timestamptz(6)
  deletedBy        String?   @db.Uuid
  version          Int       @default(1)

  campaign     Campaign      @relation(fields: [campaignId], references: [id])
  leadList     LeadList?     @relation(fields: [leadListId], references: [id])
  assignedUser User?         @relation(fields: [assignedToUserId], references: [id])
  assignedTeam Team?         @relation(fields: [assignedToTeamId], references: [id])
  phones       LeadPhone[]
  customFieldRows LeadCustomField[]
  calls        Call[]

  @@index([tenantId, campaignId, status])
  @@index([tenantId, assignedToUserId])
  @@index([tenantId, assignedToTeamId])
  @@index([tenantId, lastDialedAt])
  @@index([tenantId, campaignId, externalId])
  @@map("leads")
}

model LeadPhone {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @db.Uuid
  leadId          String    @db.Uuid
  phoneNumber     String    @db.VarChar(20)
  type            String    @db.VarChar(20)
  isPrimary       Boolean   @default(false)
  isValid         Boolean   @default(true)
  validationError String?   @db.VarChar(255)
  createdAt       DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime  @updatedAt @db.Timestamptz(6)

  lead Lead @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([tenantId, leadId])
  @@index([tenantId, phoneNumber])
  @@map("lead_phones")
}

model LeadCustomField {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid
  leadId    String    @db.Uuid
  key       String    @db.VarChar(100)
  value     String?   @db.Text
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)

  lead Lead @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([tenantId, leadId])
  @@map("lead_custom_fields")
}
```

## 8. DNC Models

```prisma
model DncList {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid
  name      String    @db.VarChar(255)
  type      String    @db.VarChar(20)
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)

  tenant   Tenant     @relation(fields: [tenantId], references: [id])
  entries  DncEntry[]
  campaigns Campaign[]

  @@index([tenantId])
  @@map("dnc_lists")
}

model DncEntry {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid
  dncListId     String    @db.Uuid
  phoneNumber   String    @db.VarChar(20)
  source        String?   @db.VarChar(100)
  effectiveDate DateTime  @db.Timestamptz(6)
  notes         String?   @db.Text
  createdAt     DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime  @updatedAt @db.Timestamptz(6)

  dncList DncList @relation(fields: [dncListId], references: [id], onDelete: Cascade)

  @@index([tenantId, dncListId])
  @@index([tenantId, phoneNumber])
  @@map("dnc_entries")
}

model DncMatch {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  leadId      String    @db.Uuid
  dncEntryId  String    @db.Uuid
  dncListId   String    @db.Uuid
  matchedAt   DateTime  @db.Timestamptz(6)
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)

  lead     Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  dncEntry DncEntry @relation(fields: [dncEntryId], references: [id], onDelete: Cascade)
  dncList  DncList  @relation(fields: [dncListId], references: [id], onDelete: Cascade)

  @@index([tenantId, leadId])
  @@map("dnc_matches")
}
```

## 9. Call Models

```prisma
model Call {
  id                 String    @id @default(uuid()) @db.Uuid
  tenantId           String    @db.Uuid
  campaignId         String    @db.Uuid
  leadId             String?   @db.Uuid
  agentId            String?   @db.Uuid
  leadPhoneId        String?   @db.Uuid
  telephonySessionId String?   @db.VarChar(255)
  callerId           String?   @db.VarChar(20)
  direction          String    @db.VarChar(10)
  state              String    @db.VarChar(20)
  dialMode           String?   @db.VarChar(20)
  startTime          DateTime? @db.Timestamptz(6)
  answerTime         DateTime? @db.Timestamptz(6)
  endTime            DateTime? @db.Timestamptz(6)
  durationSeconds    Int?
  talkTimeSeconds    Int?
  holdTimeSeconds    Int?
  dispositionId      String?   @db.Uuid
  dispositionNotes   String?   @db.Text
  isAbandoned        Boolean   @default(false)
  isRecorded         Boolean   @default(false)
  recordingPaused    Boolean   @default(false)
  createdAt          DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt          DateTime  @updatedAt @db.Timestamptz(6)
  createdBy          String?   @db.Uuid
  updatedBy          String?   @db.Uuid
  deletedAt          DateTime? @db.Timestamptz(6)
  deletedBy          String?   @db.Uuid
  version            Int       @default(1)

  campaign     Campaign             @relation(fields: [campaignId], references: [id])
  lead         Lead?                @relation(fields: [leadId], references: [id])
  agent        User?                @relation(fields: [agentId], references: [id])
  leadPhone    LeadPhone?           @relation(fields: [leadPhoneId], references: [id])
  events       CallEvent[]
  recording    Recording?
  callbacks    Callback[]
  notes        CallNote[]
  tags         CallTag[]

  @@index([tenantId, campaignId])
  @@index([tenantId, agentId])
  @@index([tenantId, leadId])
  @@index([tenantId, state])
  @@index([tenantId, createdAt])
  @@index([telephonySessionId])
  @@map("calls")
}

model CallEvent {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @db.Uuid
  callId     String    @db.Uuid
  eventType  String    @db.VarChar(50)
  payload    Json?     @default("{}")
  occurredAt DateTime  @db.Timestamptz(6)
  createdAt  DateTime  @default(now()) @db.Timestamptz(6)

  call Call @relation(fields: [callId], references: [id], onDelete: Cascade)

  @@index([tenantId, callId])
  @@index([tenantId, eventType])
  @@index([tenantId, occurredAt])
  @@map("call_events")
}

model Callback {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  callId      String    @db.Uuid
  leadId      String    @db.Uuid
  agentId     String    @db.Uuid
  scheduledAt DateTime  @db.Timestamptz(6)
  timezone    String    @db.VarChar(50)
  status      String    @db.VarChar(20)
  notes       String?   @db.Text
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)

  call Call @relation(fields: [callId], references: [id], onDelete: Cascade)
  lead Lead @relation(fields: [leadId], references: [id])
  agent User @relation(fields: [agentId], references: [id])

  @@index([tenantId, agentId, scheduledAt])
  @@index([tenantId, status, scheduledAt])
  @@map("callbacks")
}

model CallNote {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid
  callId    String    @db.Uuid
  note      String    @db.Text
  createdBy String?   @db.Uuid
  createdAt DateTime  @default(now()) @db.Timestamptz(6)

  call Call @relation(fields: [callId], references: [id], onDelete: Cascade)

  @@index([tenantId, callId])
  @@map("call_notes")
}

model CallTag {
  callId    String    @db.Uuid
  tag       String    @db.VarChar(50)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)

  call Call @relation(fields: [callId], references: [id], onDelete: Cascade)

  @@id([callId, tag])
  @@map("call_tags")
}
```

## 10. Recording Models

```prisma
model Recording {
  id              String    @id @default(uuid()) @db.Uuid
  tenantId        String    @db.Uuid
  callId          String    @unique @db.Uuid
  storageProvider String    @db.VarChar(20)
  storageBucket   String    @db.VarChar(100)
  storagePath     String    @db.VarChar(500)
  storageKeyId    String?   @db.VarChar(255)
  format          String    @db.VarChar(10)
  durationSeconds Int       @db.Integer
  fileSizeBytes   BigInt?
  status          String    @db.VarChar(20)
  uploadedAt      DateTime? @db.Timestamptz(6)
  retentionUntil  DateTime? @db.Timestamptz(6)
  createdAt       DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt       DateTime  @updatedAt @db.Timestamptz(6)

  call      Call         @relation(fields: [callId], references: [id], onDelete: Cascade)
  transcripts Transcript[]
  summaries AiSummary[]
  sentiments Sentiment[]
  qaScores  QaScore[]

  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@map("recordings")
}

model Transcript {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @db.Uuid
  recordingId String @db.Uuid
  callId     String    @db.Uuid
  language   String?   @db.VarChar(10)
  status     String    @db.VarChar(20)
  fullText   String?   @db.Text
  segments   Json?     @default("[]")
  createdAt  DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @db.Timestamptz(6)

  recording Recording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  call      Call      @relation(fields: [callId], references: [id])

  @@index([tenantId, recordingId])
  @@map("transcripts")
}

model AiSummary {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  recordingId String    @db.Uuid
  callId      String    @db.Uuid
  summary     String?   @db.Text
  keyPhrases  Json?     @default("[]")
  status      String    @db.VarChar(20)
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)

  recording Recording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  call      Call      @relation(fields: [callId], references: [id])

  @@map("ai_summaries")
}

model Sentiment {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @db.Uuid
  recordingId      String    @db.Uuid
  callId           String    @db.Uuid
  overallSentiment String    @db.VarChar(20)
  score            Decimal?  @db.Decimal(3, 2)
  segments         Json?     @default("[]")
  status           String    @db.VarChar(20)
  createdAt        DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt        DateTime  @updatedAt @db.Timestamptz(6)

  recording Recording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  call      Call      @relation(fields: [callId], references: [id])

  @@map("sentiments")
}

model QaRubric {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid
  name      String    @db.VarChar(255)
  criteria  Json      @default("[]")
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)

  qaScores QaScore[]

  @@map("qa_rubrics")
}

model QaScore {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  recordingId String    @db.Uuid
  callId      String    @db.Uuid
  rubricId    String?   @db.Uuid
  scoredBy    String?   @db.Uuid
  isAuto      Boolean   @default(false)
  totalScore  Int?
  maxScore    Int?
  criteria    Json?     @default("[]")
  notes       String?   @db.Text
  status      String    @db.VarChar(20)
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)

  recording Recording @relation(fields: [recordingId], references: [id], onDelete: Cascade)
  call      Call      @relation(fields: [callId], references: [id])
  rubric    QaRubric? @relation(fields: [rubricId], references: [id])

  @@map("qa_scores")
}
```

## 11. Integration & Webhook Models

```prisma
model Integration {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @db.Uuid
  name        String    @db.VarChar(255)
  type        String    @db.VarChar(50)
  config      Json?     @default("{}")
  credentials Json?     @default("{}")
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)

  logs IntegrationLog[]

  @@map("integrations")
}

model IntegrationLog {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid
  integrationId String    @db.Uuid
  direction     String    @db.VarChar(10)
  eventType     String    @db.VarChar(50)
  request       Json?     @default("{}")
  response      Json?     @default("{}")
  status        String    @db.VarChar(20)
  errorMessage  String?   @db.Text
  createdAt     DateTime  @default(now()) @db.Timestamptz(6)

  integration Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)

  @@map("integration_logs")
}

model Webhook {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  name         String    @db.VarChar(255)
  url          String    @db.VarChar(500)
  secret       String?   @db.VarChar(255)
  eventFilters Json      @default("[]")
  retryPolicy  Json?     @default("{}")
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @db.Timestamptz(6)

  deliveries WebhookDelivery[]

  @@map("webhooks")
}

model WebhookDelivery {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid
  webhookId     String    @db.Uuid
  eventId       String    @db.VarChar(255)
  eventType     String    @db.VarChar(50)
  payload       Json?     @default("{}")
  status        String    @db.VarChar(20)
  httpStatus    Int?
  responseBody  String?   @db.Text
  attemptCount  Int       @default(0)
  nextAttemptAt DateTime? @db.Timestamptz(6)
  deliveredAt   DateTime? @db.Timestamptz(6)
  createdAt     DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime  @updatedAt @db.Timestamptz(6)

  webhook Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([tenantId, webhookId])
  @@index([tenantId, status, nextAttemptAt])
  @@map("webhook_deliveries")
}
```

## 12. Notification & Audit Models

```prisma
model Notification {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @db.Uuid
  userId    String    @db.Uuid
  type      String    @db.VarChar(50)
  eventType String    @db.VarChar(50)
  title     String    @db.VarChar(255)
  body      String?   @db.Text
  data      Json?     @default("{}")
  status    String    @db.VarChar(20)
  readAt    DateTime? @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id])

  @@index([tenantId, userId])
  @@index([tenantId, status])
  @@map("notifications")
}

model Audit {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @db.Uuid
  actorId      String?   @db.Uuid
  actorType    String    @db.VarChar(20)
  action       String    @db.VarChar(50)
  resourceType String    @db.VarChar(50)
  resourceId   String?   @db.Uuid
  beforeSnapshot Json?   @default("{}")
  afterSnapshot  Json?   @default("{}")
  ipAddress    String?   @db.VarChar(45)
  userAgent    String?   @db.Text
  metadata     Json?     @default("{}")
  createdAt    DateTime  @default(now()) @db.Timestamptz(6)

  @@index([tenantId, actorId])
  @@index([tenantId, resourceType, resourceId])
  @@index([tenantId, action])
  @@index([tenantId, createdAt])
  @@map("audits")
}
```

## 13. Settings & System Models

```prisma
model Setting {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String?   @db.Uuid
  key         String    @db.VarChar(100)
  value       Json      @default("{}")
  isEncrypted Boolean   @default(false)
  createdAt   DateTime  @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @db.Timestamptz(6)

  tenant Tenant? @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, key])
  @@map("settings")
}

model SystemHealthCheck {
  id        String    @id @default(uuid()) @db.Uuid
  service   String    @db.VarChar(50)
  status    String    @db.VarChar(20)
  message   String?   @db.Text
  checkedAt DateTime  @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @db.Timestamptz(6)

  @@map("system_health_checks")
}
```

## 14. Migrations

- Migrations are generated with `prisma migrate dev`.
- Production migrations applied with `prisma migrate deploy`.
- Partitioning and advanced indexes are added via raw SQL in migration files.
- Migration naming convention: `YYYYMMDDhhmmss_description`.
- Migration history stored in `prisma/migrations/`.

## 15. Prisma Client Extensions

Extensions are used to enforce:
- Tenant filtering on all queries.
- Soft delete filtering.
- Audit field population.
- Optimistic locking checks.

Example:

```typescript
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query, model }) {
        if (tenantContext) {
          args.where = { ...args.where, tenantId: tenantContext.tenantId };
        }
        return query(args);
      },
    },
  },
});
```

## 16. Seeding

- Seed scripts in `prisma/seed.ts` create default roles, permissions, a demo tenant, and sample data.
- Seeds run in development and staging only; never in production.
