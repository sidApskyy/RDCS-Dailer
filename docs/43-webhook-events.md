# 43 — Webhook Events

**Document Control**

| Property | Value |
|----------|-------|
| Title | Webhook Events |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the webhook events and delivery mechanism for the RDCS In-House Dialer Platform. Webhooks allow external systems (CRM, analytics, custom integrations) to receive real-time notifications of platform events.

## 2. Webhook Subscription Model

Each subscription defines:
- URL
- Secret (for HMAC signature)
- Event filters (list of event types)
- Active/inactive status
- Retry policy

## 3. Supported Webhook Events

| Event Type | Description | Payload |
|------------|-------------|---------|
| `tenant.created` | New tenant provisioned | tenantId, name, slug, createdAt |
| `tenant.updated` | Tenant settings updated | tenantId, changedFields, updatedAt |
| `user.created` | New user created | userId, tenantId, email, roleIds, createdAt |
| `user.updated` | User updated | userId, tenantId, changedFields, updatedAt |
| `user.deactivated` | User deactivated | userId, tenantId, deactivatedAt |
| `campaign.created` | Campaign created | campaignId, tenantId, name, mode, createdAt |
| `campaign.activated` | Campaign activated | campaignId, tenantId, activatedAt |
| `campaign.paused` | Campaign paused | campaignId, tenantId, reason, pausedAt |
| `campaign.completed` | Campaign completed | campaignId, tenantId, completedAt |
| `lead.created` | Lead created | leadId, tenantId, campaignId, leadListId, status, createdAt |
| `lead.updated` | Lead updated | leadId, tenantId, changedFields, updatedAt |
| `lead.imported` | Lead list import completed | leadListId, tenantId, campaignId, totalRows, validRows, invalidRows, dncRows, completedAt |
| `lead.dnc` | Lead marked as DNC | leadId, tenantId, phoneNumber, dncListId, matchedAt |
| `lead.recycled` | Lead recycled | leadId, tenantId, recycleAttempt, status |
| `call.initiated` | Call initiated | callId, tenantId, campaignId, leadId, agentId, callerId, createdAt |
| `call.ringing` | Call ringing | callId, tenantId, timestamp |
| `call.answered` | Call answered | callId, tenantId, answerTime, durationEstimate |
| `call.completed` | Call completed | callId, tenantId, campaignId, leadId, agentId, dispositionId, durationSeconds, isAbandoned, completedAt |
| `call.voicemail` | Voicemail detected | callId, tenantId, leadId, confidence, timestamp |
| `disposition.set` | Disposition set | callId, tenantId, leadId, dispositionId, dispositionCode, notes, timestamp |
| `callback.created` | Callback scheduled | callbackId, callId, tenantId, leadId, agentId, scheduledAt, timezone |
| `callback.completed` | Callback completed | callbackId, callId, tenantId, completedAt |
| `recording.available` | Recording uploaded | recordingId, callId, tenantId, storageUrl, durationSeconds, format, uploadedAt |
| `transcript.completed` | Transcription completed | transcriptId, recordingId, callId, tenantId, language, status, completedAt |
| `summary.generated` | Call summary generated | summaryId, recordingId, callId, tenantId, summary, completedAt |
| `sentiment.analyzed` | Sentiment analyzed | sentimentId, recordingId, callId, tenantId, overallSentiment, score, completedAt |
| `qa.score.generated` | QA score generated | scoreId, recordingId, callId, tenantId, totalScore, maxScore, isAuto, completedAt |
| `compliance.violation` | Compliance violation | tenantId, campaignId, leadId, rule, message, timestamp |
| `abandon.rate.exceeded` | Abandon rate exceeded | campaignId, tenantId, currentRate, threshold, timestamp |
| `dnc.entry.added` | DNC entry added | dncEntryId, dncListId, tenantId, phoneNumber, effectiveDate |
| `report.generated` | Report generated | reportId, tenantId, generatedBy, format, downloadUrl, generatedAt |
| `integration.synced` | Integration sync completed | integrationId, tenantId, direction, recordsProcessed, status, syncedAt |
| `webhook.delivery.failed` | Webhook delivery failed | deliveryId, webhookId, tenantId, eventId, attemptCount, error, timestamp |
| `notification.sent` | Notification sent | notificationId, tenantId, userId, channel, status, sentAt |

## 4. Webhook Payload Format

```json
{
  "eventId": "evt_123456789",
  "eventType": "call.completed",
  "tenantId": "ten_abc123",
  "timestamp": "2026-07-21T10:00:00Z",
  "correlationId": "corr_987654321",
  "version": 1,
  "payload": {
    "callId": "call_001",
    "campaignId": "camp_456",
    "leadId": "lead_789",
    "agentId": "usr_123",
    "dispositionId": "disp_123",
    "dispositionCode": "converted",
    "durationSeconds": 120,
    "isAbandoned": false,
    "completedAt": "2026-07-21T10:00:00Z"
  }
}
```

## 5. HMAC Signature

Each webhook request includes a signature header:

```
X-RDCS-Signature: sha256=<hex_hmac_sha256>
```

The HMAC is computed over the JSON payload using the webhook secret:

```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

Consumers should verify the signature before processing.

## 6. Retry Policy

- Failed deliveries retried with exponential backoff.
- Default: 10 attempts over 24 hours.
- Retry intervals: 1 min, 2 min, 4 min, 8 min, 15 min, 30 min, 1 hr, 2 hr, 4 hr, 8 hr.
- After exhausting retries, event moved to DLQ and optionally notified.
- Successful delivery (2xx response) stops retries.

## 7. Delivery Record

Each attempt is recorded in `webhook_deliveries` table:
- deliveryId
- webhookId
- eventId
- eventType
- payload
- status
- httpStatus
- responseBody
- attemptCount
- nextAttemptAt
- deliveredAt

## 8. Webhook Endpoint Security

- Receiving endpoints must use HTTPS.
- Signature verification strongly recommended.
- Receiving systems should respond quickly (< 5 seconds) to avoid timeout.
- Receiving systems should return 2xx on success; 4xx/5xx triggers retry.
- Webhook delivery IP whitelist available for additional security.

## 9. Webhook Ordering

- Best-effort ordering per subscription.
- Events include `eventId` and `timestamp` for consumer ordering.
- Consumers should use idempotency to handle out-of-order or duplicate events.

## 10. Example Webhook Consumer

```python
import hmac, hashlib, json
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = 'whsec_123456'

@app.route('/webhooks/rdcs', methods=['POST'])
def handle_webhook():
    payload = request.get_data()
    signature = request.headers.get('X-RDCS-Signature', '').replace('sha256=', '')
    expected = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return 'Unauthorized', 401

    event = request.json
    if event['eventType'] == 'call.completed':
        process_call_completed(event['payload'])
    return 'OK', 200
```

## 11. Webhook Filtering

Subscriptions can filter by event type. Only events matching the filter are delivered. Event filters are stored as JSON array:

```json
["lead.created", "call.completed", "recording.available"]
```

Empty filter array means no events delivered. Wildcards are not supported in MVP.

## 12. Webhook Testing

- Subscribers can send a test event via `POST /webhooks/:id/test`.
- Test events include a `test: true` flag in payload metadata.
- Delivery history visible in UI and API.

## 13. Webhook Failure Alerts

- Tenant admins notified when webhook fails repeatedly.
- Alert includes webhook name, event type, and last error.
- Failed webhook delivery events also emitted as internal events.

## 14. Scalability

- Webhook delivery handled by dedicated BullMQ workers.
- Rate limiting per webhook to avoid overwhelming receivers.
- Workers scale horizontally based on queue depth.
- High-priority webhooks can use dedicated queues in future.

## 15. Future Enhancements

- Custom payload templating.
- Webhook batching.
- Webhook filtering by campaign, department, or event payload conditions.
- Signed webhook URL verification.
- Webhook analytics dashboard.
