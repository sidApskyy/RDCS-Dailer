# 25 — Asterisk Call Flow

**Document Control**

| Property | Value |
|----------|-------|
| Title | Asterisk Call Flow |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document describes the Asterisk call flows for the RDCS In-House Dialer Platform. It covers outbound dialing, agent connection, call handling, recording, transfers, and dispositions.

## 2. Asterisk Configuration Overview

Asterisk is configured with:
- SIP trunks for carrier connectivity (`pjsip.conf` or `sip.conf`).
- Agent endpoints for WebRTC/SIP phones (`pjsip.conf`).
- Dialplan for call handling (`extensions.conf`).
- AMI/ARI users for application control (`manager.conf`, `ari.conf`).
- CDR/CEL for call records.
- MixMonitor for recording.
- AMD application for answering machine detection.

## 3. Outbound Call Flow

### 3.1 Sequence Diagram

```mermaid
sequenceDiagram
    participant App as Application
    participant Adapter as Telephony Adapter
    participant AMI as Asterisk AMI
    participant Asterisk as Asterisk
    participant Trunk as SIP Trunk
    participant Phone as Lead Phone
    participant Agent as Agent Phone

    App->>Adapter: originate(lead, agent, callerId)
    Adapter->>AMI: Action: Originate
    AMI->>Asterisk: Create channel to lead
    Asterisk->>Trunk: INVITE (lead number, callerId)
    Trunk->>Phone: Ring
    Phone-->>Trunk: 180 Ringing
    Trunk-->>Asterisk: Ringing
    Asterisk-->>AMI: Dial event
    AMI-->>Adapter: ringing
    Adapter-->>App: CallRingingEvent

    alt Human answers
        Phone-->>Trunk: 200 OK
        Trunk-->>Asterisk: 200 OK
        Asterisk->>Asterisk: MixMonitor start, AMD start
        Asterisk-->>AMI: Answer event
        AMI-->>Adapter: answered
        Adapter-->>App: CallAnsweredEvent
        Asterisk->>Agent: Bridge agent channel
        Agent->>Asterisk: Answer
        Asterisk->>Asterisk: Stop AMD (if human)
        Phone<->Agent: Conversation
    else Voicemail / Machine
        Asterisk->>Asterisk: AMD detects machine
        Asterisk-->>AMI: AMD event (MACHINE)
        AMI-->>Adapter: voicemail
        Adapter-->>App: VoicemailDetectedEvent
        App->>Adapter: hangup(callId)
        Adapter->>AMI: Action: Hangup
        AMI->>Asterisk: Hangup channel
        Asterisk->>Trunk: BYE
    end

    Agent->>Asterisk: Hangup or transfer
    Asterisk->>Trunk: BYE
    Trunk->>Phone: Call ended
    Asterisk-->>AMI: Hangup event
    AMI-->>Adapter: completed
    Adapter-->>App: CallCompletedEvent
    App->>Adapter: stopRecording(callId)
    Adapter->>AMI: Action: StopMonitor
    Asterisk->>Asterisk: MixMonitor stops, file closed
    Asterisk-->>AMI: Recording file path
    AMI-->>Adapter: recordingAvailable
    Adapter-->>App: RecordingAvailableEvent
```

## 4. Agent Registration & Login

1. Agent authenticates in web app.
2. Web app receives WebRTC configuration or SIP credentials.
3. Agent browser registers to Asterisk via WebSocket/WSS (PJSIP).
4. Asterisk confirms registration; adapter notifies application.
5. Agent sets status to Available; dialer can now offer calls.

## 5. Call States Mapping

| Asterisk Event | Platform Call State | Notes |
|----------------|---------------------|-------|
| OriginateResponse | initiated | Call creation response |
| Dial / Ringing | ringing | Remote end ringing |
| Answer | answered | Human or machine picked up |
| AMD MACHINE | voicemail | Answering machine detected |
| AMD HUMAN | answered | Human detected |
| Hangup | completed | Call ended |
| Busy | busy | Line busy |
| NoAnswer | no-answer | No answer within timeout |
| Congestion / CHANUNAVAIL | failed | Network or channel failure |
| Bridge | connected | Agent and lead bridged |
| Transfer | transferred | Call transferred |

## 6. Recording Flow

1. Application starts recording via adapter: `startRecording(callId)`.
2. Adapter sends `Action: MixMonitor` with filename path.
3. Asterisk begins recording both legs to local file.
4. Agent may pause/resume recording via adapter: `pauseRecording`/`resumeRecording`.
5. On hangup, Asterisk closes recording file.
6. Asterisk emits `MonitorStop` event or file path in CDR.
7. Recording worker uploads file to S3/MinIO.
8. Metadata stored in PostgreSQL; `RecordingAvailableEvent` emitted.

## 7. Transfer Flow

### 7.1 Warm Transfer

1. Agent requests transfer to target.
2. Application validates target and permission.
3. Adapter sends `Action: Originate` to create new call to target.
4. Agent consults with target while lead is on hold.
5. On confirmation, adapter bridges all three parties or transfers lead to target.
6. If target unavailable, agent can retrieve lead.

### 7.2 Cold Transfer

1. Agent requests transfer to target.
2. Adapter sends `Action: Redirect` or `BlindTransfer`.
3. Lead is immediately connected to target; agent drops off.

## 8. Hold, Mute, DTMF

| Action | AMI Action | Notes |
|--------|-----------|-------|
| Hold | Pause / Park | Lead placed on hold music |
| Resume | Unpause / Unpark | Retrieve from hold |
| Mute | Channel variable or mute command | Mute agent leg |
| Send DTMF | Action: PlayDTMF | Dial digits to IVR |
| Conference | ConfBridge application | Multi-party call |

## 9. Disposition and Wrap-Up

1. Agent or system sets disposition in application.
2. Application records disposition, call duration, talk time.
3. Application updates lead status (callable, completed, callback, DNC, etc.).
4. Agent enters wrap-up state.
5. Dialer waits for wrap-up completion before offering next call.

## 10. Predictive/Power Dialing Flow

1. Dialer Worker selects leads and agents.
2. Adapter originates multiple calls without agents pre-assigned.
3. On answer with AMD HUMAN, adapter requests available agent from dialer.
4. Agent bridged to answered call.
5. If no agent available, call is abandoned (informational message played).
6. Abandon event counted and monitored for compliance.

## 11. Callback Flow

1. Callback scheduled in application.
2. Callback worker queues lead at scheduled time.
3. Dialer selects agent and originates call to lead.
4. Agent sees callback context (previous notes, scheduled reason).

## 12. Failure Handling

| Scenario | Asterisk Behavior | Application Behavior |
|----------|-------------------|----------------------|
| Trunk failure | CHANUNAVAIL | Retry alternate trunk, mark failed |
| No answer | NoAnswer | Apply retry/recycle logic |
| Busy | Busy | Schedule retry, apply disposition |
| AMD timeout | NOTSURE | Treat as human or retry per policy |
| Agent not answering | Agent channel unavailable | Requeue call, mark agent away |
| Recording failure | File missing | Alert, retry, log incident |

## 13. CDR/CEL Configuration

- CDR records: start time, answer time, end time, duration, disposition, channel, destination.
- CEL records: detailed event log for debugging and compliance.
- CDR/CEL written to PostgreSQL via ODBC or cdr_adaptive_odbc.
- Platform primarily uses its own call state machine but cross-references CDRs for reconciliation.

## 14. Asterisk Dialplan Example (Outbound)

```ini
[rdcs-outbound]
exten => _X.,1,NoOp(RDCS outbound call to ${EXTEN})
 same => n,Set(CALLERID(num)=${CALLERID_NUM})
 same => n,MixMonitor(${RECORDING_FILE}.wav,b)
 same => n,AMD(2000,2000,1000,5000,120,50,50,3)
 same => n,GotoIf($["${AMDSTATUS}" = "MACHINE"]?voicemail)
 same => n,Dial(PJSIP/${EXTEN}@${TRUNK_NAME},,g)
 same => n,Hangup()
 same => n(voicemail),NoOp(Machine detected)
 same => n,Hangup()
```

## 15. AMI Configuration

```ini
[rdcs-manager]
secret = <from-secret-manager>
permit = 10.0.0.0/8
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,agent,user,command,config,reporting,originate
writetimeout = 5000
```

## 16. Security Considerations

- Restrict AMI access to application server IPs.
- Use strong, rotated AMI credentials.
- Disable unused Asterisk modules and services.
- Enable fail2ban for SIP/AMI brute-force protection.
- Use TLS for AMI (AMI over TLS) and WebRTC (WSS/DTLS-SRTP).
- Monitor CDR for unusual calling patterns.
