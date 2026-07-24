# 44 — Notification Flow

**Document Control**

| Property | Value |
|----------|-------|
| Title | Notification Flow |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the notification flow for the RDCS In-House Dialer Platform. Notifications inform users and external systems of important events via in-app, email, SMS, and webhook channels.

## 2. Notification Channels

| Channel | Purpose | Provider |
|---------|---------|----------|
| In-app | Real-time UI notifications | Socket.IO + database |
| Email | Alerts, summaries, reports | SMTP / AWS SES / SendGrid |
| SMS | Urgent alerts | Twilio / Telnyx / SignalWire |
| Webhook | External system integration | See `43-webhook-events.md` |
| Push | Future mobile/browser push | FCM / Web Push |

## 3. Notification Types

| Type | Trigger | Channels |
|------|---------|----------|
| Welcome | New user invitation | Email, in-app |
| Password Reset | Password reset request | Email |
| MFA Enrollment | TOTP setup | Email, in-app |
| Account Locked | Multiple failed logins | Email, in-app |
| Call Offer | New call offered to agent | In-app, Socket.IO |
| Callback Reminder | Callback due soon | In-app, email, SMS |
| Disposition Required | Call ended, disposition missing | In-app, Socket.IO |
| Abandon Rate Alert | Abandon rate exceeded | In-app, email, SMS |
| Compliance Violation | TCPA/DNC/timezone violation | In-app, email, SMS |
| Recording Available | Recording processed | In-app, webhook |
| Report Ready | Scheduled report completed | Email, in-app, webhook |
| AI Job Completed | STT/summary/sentiment done | In-app |
| Webhook Failure | Webhook delivery failed | In-app, email |
| System Alert | Infrastructure issue | Email, SMS, webhook |
| Team Message | Supervisor to agent | In-app, Socket.IO |

## 4. Notification Architecture

```
Event Source
  │
  ▼
Notification Service
  │
  ├─> Determine recipients and channels
  ├─> Load user preferences
  ├─> Render template
  │
  ▼
BullMQ Notification Queue
  │
  ├─> In-app Worker → Socket.IO + DB
  ├─> Email Worker → SMTP/SES
  ├─> SMS Worker → Twilio/Telnyx
  └─> Webhook Worker → External URL
```

## 5. Notification Preferences

Users can configure preferences per channel and event type:

| Setting | Default | Override |
|---------|---------|----------|
| Email enabled | true | User can disable non-critical |
| SMS enabled | false | User can enable urgent |
| In-app enabled | true | Cannot disable |
| Webhook enabled | true | Configured per integration |
| Digest frequency | immediate | daily/weekly digest options |
| Quiet hours | none | Time window for SMS/email |

## 6. Notification Template Model

Templates support variable substitution and localization:

```json
{
  "templateId": "call-abandon-alert",
  "eventType": "abandon.rate.exceeded",
  "channel": "email",
  "subject": "Abandon rate exceeded for {{campaignName}}",
  "body": "Campaign {{campaignName}} has an abandon rate of {{currentRate}}%, exceeding the threshold of {{threshold}}%."
}
```

## 7. In-App Notification Flow

1. Notification event emitted.
2. Notification Worker creates `Notification` record in database.
3. Socket.IO pushes `notification:new` to user's room.
4. UI displays badge and dropdown.
5. User marks as read; database updated and UI refreshed.

## 8. Email Notification Flow

1. Notification Worker renders email template.
2. Email sent via configured provider (SMTP/SES/SendGrid).
3. Delivery status tracked (sent, bounced, failed).
4. Bounces and failures logged.

## 9. SMS Notification Flow

1. Notification Worker renders SMS template.
2. SMS sent via Twilio/Telnyx/SignalWire.
3. Delivery status tracked.
4. Rate-limited to avoid spam and cost overruns.

## 10. Webhook Notification Flow

Webhook notifications are a subset of the general webhook engine. See `43-webhook-events.md`.

## 11. Multi-Channel Routing Logic

- Critical events (compliance, system alerts) send to all enabled channels.
- Urgent events (abandon rate, callback reminder) send to in-app, email, SMS if enabled.
- Routine events (report ready, AI completed) send to in-app and email.
- User preferences can suppress non-critical email/SMS but not in-app or critical alerts.

## 12. Notification Queuing

- All notifications queued in BullMQ `notifications` queue.
- Immediate delivery by default.
- Digest mode groups notifications and sends at scheduled time.
- Failed notifications retried per channel policy.

## 13. Rate Limiting

- Email: configurable per tenant/provider.
- SMS: hard limits to prevent abuse and cost spikes.
- In-app: no explicit rate limit but throttled UI updates.
- Webhook: per-subscription rate limit.

## 14. Templating & Localization

- Templates stored in database per tenant.
- Default templates provided in English.
- Future support for multiple languages.
- Variable substitution validated against event payload.
- HTML templates sanitized to prevent XSS.

## 15. Notification Status Tracking

Each notification record tracks:
- `status`: pending, sent, delivered, read, failed, cancelled
- `channel`: in-app, email, sms, webhook
- `sentAt`, `deliveredAt`, `readAt`, `failedAt`
- `errorMessage` if failed
- `retryCount`

## 16. Notification API

See `40-rest-api-documentation.md` for endpoints. Key endpoints:

- `GET /notifications` — list user notifications
- `PATCH /notifications/:id/read` — mark as read
- `PATCH /notifications/read-all` — mark all read
- `GET /notifications/preferences` — get preferences
- `PATCH /notifications/preferences` — update preferences
- `POST /notifications/templates` — manage templates (admin)

## 17. Security & Privacy

- No passwords or secrets in notification payloads.
- PII in emails/SMS minimized and sent over TLS.
- Opt-out honored for non-critical notifications.
- Audit log records notification creation for sensitive events.

## 18. Monitoring

- Notifications queued/sent/delivered/failed per channel.
- Email bounce and complaint rates.
- SMS delivery rates and costs.
- In-app unread counts and engagement.
- Notification latency from trigger to delivery.
