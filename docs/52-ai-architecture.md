# 52 — AI Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | AI Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the AI architecture for the RDCS In-House Dialer Platform. AI modules are developed in-house or integrated via adapters, with all processing managed through the platform.

## 2. AI Modules

| Module | Description | Trigger |
|--------|-------------|---------|
| Speech-to-Text (STT) | Convert recordings to transcripts | recording.available |
| Call Summaries | Generate concise summaries | transcription.completed |
| Sentiment Analysis | Classify call sentiment | transcription.completed |
| Auto-QA | Score calls against rubrics | transcription.completed |
| Auto-Disposition | Suggest or auto-apply dispositions | transcription + call metadata |
| Real-Time Transcription | Stream transcript during call | live audio stream |
| Future AI Agent | Conversational AI agent support | future |

## 3. AI Architecture Principles

- AI is a separate bounded context; does not leak into core call logic.
- All AI processing is asynchronous via BullMQ workers.
- AI services are pluggable via adapters (local models, external APIs, hybrid).
- PII and recording data handled per security and compliance policies.
- AI results are suggestions unless explicitly auto-approved.

## 4. AI Adapter Pattern

```typescript
interface IAIAdapter {
  transcribe(audioUrl: string, language?: string): Promise<TranscriptResult>;
  summarize(transcript: string): Promise<SummaryResult>;
  analyzeSentiment(transcript: string): Promise<SentimentResult>;
  scoreQA(transcript: string, rubric: QaRubric): Promise<QaScoreResult>;
  suggestDisposition(transcript: string, dispositions: Disposition[]): Promise<DispositionSuggestion>;
  streamTranscribe(audioStream: ReadableStream): AsyncIterable<TranscriptSegment>;
}
```

Adapters implemented:
- Local Whisper-style model (self-hosted).
- OpenAI Whisper API adapter.
- Google Cloud Speech-to-Text adapter.
- Amazon Transcribe adapter.
- Azure Speech Services adapter.
- Custom LLM adapter for summaries and sentiment.

## 5. AI Processing Flow

```
recording.available event
  │
  ▼
AI Worker queues Transcription job
  │
  ▼
STT Adapter transcribes recording
  │
  ▼
Transcript stored in transcripts table
  │
  ├─> Summary job queued
  ├─> Sentiment job queued
  ├─> QA scoring job queued
  └─> Auto-disposition job queued
  │
  ▼
Results stored and events emitted
  │
  ├─> Socket.IO: notify agent/supervisor
  ├─> Webhook: ai.transcript.completed
  └─> Analytics: update sentiment/QA metrics
```

## 6. Speech-to-Text

- Recordings uploaded to object storage.
- STT adapter retrieves audio and produces transcript.
- Transcript stored with segments (start/end, speaker, confidence).
- Language detection or explicit language configured.
- Speaker diarization (future).

## 7. Call Summaries

- LLM adapter generates summary from transcript and call metadata.
- Key phrases and action items extracted.
- Summary editable/confirmable by QA/supervisor.
- Used for triage and quick review.

## 8. Sentiment Analysis

- Segment-level sentiment: positive, neutral, negative.
- Call-level aggregate sentiment and score.
- Trends by campaign, agent, time period.
- Alerts on negative sentiment spikes (configurable).

## 9. Auto-QA

- Rubric criteria: script adherence, greeting, compliance, tone, closing.
- LLM or rule-based scoring per criterion.
- Total score and max score stored.
- Human QA can override or confirm.
- Calibration loop improves accuracy.

## 10. Auto-Disposition

- Suggests disposition based on transcript and call outcome signals.
- Can be configured to auto-apply for specific dispositions with high confidence.
- Agent/Supervisor can override.
- Audit trail records auto vs. manual disposition.

## 11. Real-Time Transcription

- Live audio stream from telephony adapter sent to real-time STT adapter.
- Transcript segments streamed to agent dashboard via WebSocket.
- Supervisor can view live transcript during monitor/barge.
- Future: agent assist suggestions based on live transcript.

## 12. Future AI Agent Support

- Pluggable agent orchestrator.
- AI agent can handle outbound calls (future regulatory permitting).
- Human handoff when confidence drops or customer requests it.
- Integration with CRM and knowledge base.
- Guardrails and compliance controls.

## 13. AI Job Queue

- Dedicated `ai` BullMQ queue.
- Jobs: Transcription, Summarization, Sentiment, QA, Auto-Disposition.
- Job priority based on tenant configuration.
- Retry on adapter failure.
- DLQ for failed jobs.

## 14. Data Privacy & Security

- PII minimized in AI payloads.
- External AI providers contractually bound to data handling terms.
- Audio/transcripts not retained by external providers beyond processing window.
- Encryption at rest and in transit.
- Audit logging of AI job execution and access.

## 15. AI Model Management

- Model versions tracked.
- A/B testing of models (future).
- Fallback models if primary fails.
- Performance and accuracy metrics tracked.

## 16. Monitoring

- AI job throughput and latency.
- STT accuracy (sampled human review).
- Sentiment and QA scoring accuracy.
- External API quota and cost.
- AI worker CPU/GPU utilization.

## 17. AI API Endpoints

See `40-rest-api-documentation.md` for AI endpoints.

## 18. Future Enhancements

- Real-time agent assist (suggested responses, knowledge articles).
- Predictive lead scoring.
- Churn prediction and next-best-action.
- Voice biometrics and authentication.
- Multilingual support and translation.
