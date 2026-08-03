import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

import { TelephonyAdapter } from './telephony.adapter';
import { CallCapabilities, CallCommand, CallEvent, CallEventType, CallFailure, CallResult, CallState } from './telephony.types';
import { TwilioClient } from './twilio.client';
import {
  TWILIO_ENV_KEYS,
  TWILIO_ERROR_MAP,
  TWILIO_POLL_INTERVAL_MS,
  TWILIO_POLL_MAX_DURATION_MS,
  TWILIO_STATUS_MAP,
  TWILIO_TERMINAL_STATUSES,
  TwilioConfig,
} from './twilio.types';

const STATE_TO_EVENT_TYPE: Record<CallState, CallEventType> = {
  [CallState.Idle]: 'call.disposed',
  [CallState.Queued]: 'call.created',
  [CallState.Dialing]: 'call.dialing',
  [CallState.Ringing]: 'call.ringing',
  [CallState.Connected]: 'call.connected',
  [CallState.OnHold]: 'call.connected',
  [CallState.Completed]: 'call.completed',
  [CallState.Busy]: 'call.failed',
  [CallState.Failed]: 'call.failed',
  [CallState.Cancelled]: 'call.cancelled',
  [CallState.NoAnswer]: 'call.failed',
  [CallState.Timeout]: 'call.failed',
  [CallState.Disposed]: 'call.disposed',
};

@Injectable()
export class TwilioAdapter implements TelephonyAdapter, OnModuleDestroy {
  readonly capabilities: CallCapabilities = {
    manualDial: true,
    cancel: true,
    hold: false,
    recording: false,
    transfer: false,
  };

  private cachedConfig: TwilioConfig | null = null;
  private cachedClient: TwilioClient | null = null;

  private readonly callSidMap = new Map<string, string>();
  private readonly callCommands = new Map<string, CallCommand>();
  private readonly eventSubjects = new Map<string, Subject<CallEvent>>();
  private readonly pollingTimers = new Map<string, NodeJS.Timeout>();
  private readonly pollStartTimes = new Map<string, number>();
  private readonly lastEmittedStates = new Map<string, string>();

  async dial(command: CallCommand): Promise<CallResult> {
    const config = this.ensureConfig();
    const client = this.ensureClient();

    let callInfo;
    try {
      callInfo = await client.createCall({
        to: command.phoneNumber,
        from: config.phoneNumber,
        twiml: `<Response><Dial>${command.phoneNumber}</Dial></Response>`,
      });
    } catch (error) {
      throw this.mapTwilioError(error);
    }

    this.callSidMap.set(command.callId, callInfo.sid);
    this.callCommands.set(command.callId, command);

    this.emitEvent(command, CallState.Dialing, callInfo.sid);
    this.lastEmittedStates.set(command.callId, CallState.Dialing);

    this.startPolling(command, callInfo.sid);

    return { providerRef: callInfo.sid, acceptedAt: new Date() };
  }

  async cancel(callId: string): Promise<void> {
    const sid = this.callSidMap.get(callId);
    if (!sid) {
      throw new NotFoundException(
        `Call ${callId} is not tracked by the Twilio adapter. This may occur after a process restart.`,
      );
    }

    const client = this.ensureClient();
    try {
      await client.cancelCall(sid);
    } catch (error) {
      throw this.mapTwilioError(error);
    }

    const command = this.callCommands.get(callId);
    if (command) {
      this.emitEvent(command, CallState.Cancelled, sid);
    }

    this.cleanupCall(callId);
  }

  events(callId: string): Observable<CallEvent> {
    if (!this.eventSubjects.has(callId)) {
      this.eventSubjects.set(callId, new Subject<CallEvent>());
    }
    return this.eventSubjects.get(callId)!.asObservable();
  }

  getConfig(): Readonly<TwilioConfig> {
    return { ...this.ensureConfig() };
  }

  onModuleDestroy(): void {
    for (const timer of this.pollingTimers.values()) clearTimeout(timer);
    this.pollingTimers.clear();
    for (const subject of this.eventSubjects.values()) subject.complete();
    this.eventSubjects.clear();
    this.callSidMap.clear();
    this.callCommands.clear();
    this.pollStartTimes.clear();
    this.lastEmittedStates.clear();
  }

  private ensureConfig(): TwilioConfig {
    if (this.cachedConfig) return this.cachedConfig;

    const accountSid = process.env[TWILIO_ENV_KEYS.ACCOUNT_SID] ?? '';
    const authToken = process.env[TWILIO_ENV_KEYS.AUTH_TOKEN] ?? '';
    const phoneNumber = process.env[TWILIO_ENV_KEYS.PHONE_NUMBER] ?? '';
    const webhookUrl = process.env[TWILIO_ENV_KEYS.WEBHOOK_URL] ?? '';
    const webhookVerifyRaw = process.env[TWILIO_ENV_KEYS.WEBHOOK_VERIFY] ?? 'true';
    const webhookVerify = webhookVerifyRaw.toLowerCase() !== 'false';

    const missing: string[] = [];
    if (!accountSid) missing.push(TWILIO_ENV_KEYS.ACCOUNT_SID);
    if (!authToken) missing.push(TWILIO_ENV_KEYS.AUTH_TOKEN);
    if (!phoneNumber) missing.push(TWILIO_ENV_KEYS.PHONE_NUMBER);
    if (!webhookUrl) missing.push(TWILIO_ENV_KEYS.WEBHOOK_URL);

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Twilio adapter is selected (TELEPHONY_PROVIDER=twilio) but required environment variables are missing: ${missing.join(', ')}. ` +
          'Set these variables or change TELEPHONY_PROVIDER to "mock" for development/testing.',
      );
    }

    if (!accountSid.startsWith('AC')) {
      throw new InternalServerErrorException(`${TWILIO_ENV_KEYS.ACCOUNT_SID} must start with "AC".`);
    }

    if (authToken.length < 32) {
      throw new InternalServerErrorException(`${TWILIO_ENV_KEYS.AUTH_TOKEN} must be at least 32 characters long.`);
    }

    this.cachedConfig = { accountSid, authToken, phoneNumber, webhookUrl, webhookVerify };
    return this.cachedConfig;
  }

  private ensureClient(): TwilioClient {
    this.ensureConfig();
    if (!this.cachedClient) {
      this.cachedClient = new TwilioClient(this.cachedConfig!.accountSid, this.cachedConfig!.authToken);
    }
    return this.cachedClient;
  }

  private startPolling(command: CallCommand, sid: string): void {
    this.pollStartTimes.set(command.callId, Date.now());

    const poll = async () => {
      const startTime = this.pollStartTimes.get(command.callId);
      if (!startTime || Date.now() - startTime >= TWILIO_POLL_MAX_DURATION_MS) {
        this.cleanupCall(command.callId);
        return;
      }

      try {
        const info = await this.ensureClient().fetchCall(sid);
        const mappedState = TWILIO_STATUS_MAP[info.status];

        if (!mappedState) {
          this.scheduleNextPoll(command.callId, poll);
          return;
        }

        if (mappedState === CallState.Queued) {
          this.scheduleNextPoll(command.callId, poll);
          return;
        }

        const lastState = this.lastEmittedStates.get(command.callId);
        if (mappedState === lastState) {
          this.scheduleNextPoll(command.callId, poll);
          return;
        }

        this.emitEvent(command, mappedState as CallState, sid);
        this.lastEmittedStates.set(command.callId, mappedState);

        if (TWILIO_TERMINAL_STATUSES.has(info.status)) {
          this.cleanupCall(command.callId);
          return;
        }
      } catch {
        // Polling error — continue polling until max duration
      }

      this.scheduleNextPoll(command.callId, poll);
    };

    this.scheduleNextPoll(command.callId, poll);
  }

  private scheduleNextPoll(callId: string, poll: () => Promise<void>): void {
    const existing = this.pollingTimers.get(callId);
    if (existing) clearTimeout(existing);
    this.pollingTimers.set(callId, setTimeout(poll, TWILIO_POLL_INTERVAL_MS));
  }

  private emitEvent(command: CallCommand, state: CallState, sid: string): void {
    const subject = this.eventSubjects.get(command.callId);
    if (!subject || subject.closed) return;

    subject.next({
      type: STATE_TO_EVENT_TYPE[state],
      callId: command.callId,
      tenantId: command.tenantId,
      agentId: command.agentId,
      state,
      occurredAt: new Date(),
      providerRef: sid,
      failure: this.extractFailure(state),
    });
  }

  private extractFailure(state: CallState): CallFailure | undefined {
    const errorInfo = TWILIO_ERROR_MAP[state as string];
    if (!errorInfo) return undefined;
    return { code: errorInfo.code, message: errorInfo.message, retryable: errorInfo.retryable };
  }

  private cleanupCall(callId: string): void {
    const timer = this.pollingTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.pollingTimers.delete(callId);
    }
    this.pollStartTimes.delete(callId);
    this.lastEmittedStates.delete(callId);
    this.callSidMap.delete(callId);
    this.callCommands.delete(callId);

    const subject = this.eventSubjects.get(callId);
    if (subject && !subject.closed) subject.complete();
    this.eventSubjects.delete(callId);
  }

  private mapTwilioError(error: unknown): Error {
    if (error instanceof Error) {
      const restError = error as { status?: number; code?: number; message: string };
      if (restError.status === 401) return new InternalServerErrorException('Twilio authentication failed');
      if (restError.status === 400) return new BadRequestException('Invalid request to Twilio API');
      if (restError.status === 429) return new InternalServerErrorException('Twilio API rate limit exceeded');
      if (restError.status === 404) return new NotFoundException('Twilio call not found');
      return new InternalServerErrorException(`Twilio API error: ${restError.message}`);
    }
    return new InternalServerErrorException('Unknown error contacting Twilio');
  }
}
