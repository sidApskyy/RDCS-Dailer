# 45 — Recording Flow

**Document Control**

| Property | Value |
|----------|-------|
| Title | Recording Flow |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the recording flow for the RDCS In-House Dialer Platform. It covers recording initiation, capture, upload, storage, playback, download, retention, and AI processing triggers.

## 2. Recording Flow Overview

```
┌─────────────────────────────────────────────────────┐
│              Call in Progress                        │
└─────────────┬───────────────────────┘
              │ campaign allows recording
              │ consent verified
              ▼
┌─────────────────────────────────────┐
│  Adapter.startRecording(callId)       │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Asterisk MixMonitor starts          │
│  Both call legs recorded to local file│
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Call ends or stopRecording() called │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Asterisk closes recording file      │
│  Emits MonitorStop event             │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Recording Worker picks up job       │
│  Uploads file to S3/MinIO            │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Recording metadata saved to DB        │
│  recording.available event emitted   │
└─────────────┬───────────────────────┘
              │
              ├─> AI Worker: STT, summary, sentiment, QA
              ├─> Socket.IO: notify agent/supervisor
              ├─> Webhook: recording.available to CRM
              └─> Audit: log recording lifecycle
```

## 3. Recording Initiation

Recording starts when:
- Campaign configuration enables recording.
- Recording consent is verified for the lead/campaign.
- Agent is connected to the call (manual/progressive/preview/power/predictive).
- For predictive/power, recording may start on answer.

API call:

```typescript
await telephonyAdapter.startRecording(callId, {
  format: 'wav',
  mix: true,
});
```

## 4. Consent Verification

Before recording, the system checks:
- Campaign recording policy.
- Lead recording consent status.
- Jurisdiction (one-party, two-party, business notification).
- If consent is not present and required, recording is not started.
- If consent is revoked during call, recording is paused and cannot resume.

## 5. Recording During Call

- Asterisk `MixMonitor` records both legs into a single file.
- Agent can pause/resume recording if policy allows.
- Paused segments are not included in playback.
- Recording state tracked in call record (`recordingPaused`, `isRecorded`).

## 6. Recording Completion

Recording stops when:
- Call ends.
- Agent explicitly stops recording.
- `stopRecording` API called.
- Consent is revoked.

Asterisk emits `MonitorStop` or includes recording path in CDR.

## 7. Upload Worker

The Recording Worker:
1. Receives `RecordingAvailableEvent` or polls pending recordings.
2. Locates local file on Asterisk server.
3. Validates file integrity and duration.
4. Encrypts file if required (SSE-S3/KMS/MinIO encryption).
5. Uploads to object storage bucket/path.
6. Updates `recordings` table with metadata.
7. Emits `recording.available` event.
8. Deletes local file after successful upload (configurable).

## 8. Storage Path Convention

```
{tenantId}/{year}/{month}/{day}/{callId}.{format}
```

Example: `ten_abc123/2026/07/21/call_001.wav`

## 9. Playback Flow

1. Authorized user requests playback.
2. Permission check (`recording:read` within scope).
3. System generates a signed URL or streams via proxy.
4. For security, signed URLs expire after 15 minutes.
5. Playback is logged in audit trail.

## 10. Download Flow

1. Authorized user requests download.
2. Permission check (`recording:download`).
3. System generates signed URL or proxies file.
4. Download logged in audit trail.
5. Optional watermarking applied based on policy.

## 11. Retention & Deletion

- Retention policy configured per tenant/campaign.
- `retentionUntil` field calculated on upload.
- Nightly job deletes or archives expired recordings.
- Deletion removes object storage file and marks DB record deleted.
- Deletion logged in audit trail.

## 12. AI Triggering

On `recording.available`:
- `TranscriptionRequested` event queued for AI Worker.
- Summary, sentiment, QA jobs queued after transcription completes.
- AI results stored and linked to recording/call.

## 13. Security

- Recordings encrypted at rest in object storage.
- TLS for playback and download.
- Access controlled by permissions and signed URLs.
- Recording metadata stored in PostgreSQL with tenant isolation.
- Audit logs for all access, download, and deletion.

## 14. Failure Handling

| Scenario | Handling |
|----------|----------|
| Upload fails | Retry 5 times with exponential backoff; alert if persistent |
| File corrupted | Mark recording as failed; alert operations |
| Storage unavailable | Queue upload until storage recovers |
| Consent missing | Do not record; log reason |
| Permission denied | Deny playback/download; audit |

## 15. Monitoring

- Recordings started/completed/failed per hour.
- Upload success rate and latency.
- Storage usage and cost per tenant.
- Playback/download access patterns.
- AI processing backlog for recordings.
