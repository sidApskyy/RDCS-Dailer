jest.mock('./twilio.client');

import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import { MockTelephonyAdapter } from './mock-telephony.adapter';
import { ProviderRegistryImpl } from './provider-registry.service';
import { TelephonyAdapter } from './telephony.adapter';
import { CallEvent, CallState } from './telephony.types';
import { TwilioAdapter } from './twilio.adapter';
import { TwilioClient } from './twilio.client';
import { TWILIO_STATUS_MAP } from './twilio.types';

const VALID_TWILIO_ENV = {
  TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(30),
  TWILIO_AUTH_TOKEN: 'x'.repeat(32),
  TWILIO_PHONE_NUMBER: '+15555555555',
  TWILIO_WEBHOOK_URL: 'http://localhost:3001/webhooks/twilio',
  TWILIO_WEBHOOK_VERIFY: 'false',
};

function setTwilioEnv(): void {
  for (const [key, value] of Object.entries(VALID_TWILIO_ENV)) {
    process.env[key] = value;
  }
}

function clearTwilioEnv(): void {
  for (const key of Object.keys(VALID_TWILIO_ENV)) {
    delete process.env[key];
  }
}

const mockCreateCall = jest.fn();
const mockFetchCall = jest.fn();
const mockCancelCall = jest.fn();

(TwilioClient as unknown as jest.Mock).mockImplementation(() => ({
  createCall: mockCreateCall,
  fetchCall: mockFetchCall,
  cancelCall: mockCancelCall,
}));

function makeCommand(overrides: Partial<{ callId: string; tenantId: string; agentId: string; leadId: string; phoneNumber: string }> = {}) {
  return {
    callId: overrides.callId || 'call-1',
    tenantId: overrides.tenantId || 'tenant-1',
    agentId: overrides.agentId || 'agent-1',
    leadId: overrides.leadId || 'lead-1',
    phoneNumber: overrides.phoneNumber || '+15551111111',
  };
}

function makeCallInfo(overrides: Partial<{ sid: string; status: string; duration: string | null; from: string; to: string }> = {}) {
  return {
    sid: overrides.sid || 'CA' + '1'.repeat(32),
    status: overrides.status || 'queued',
    duration: overrides.duration ?? null,
    from: overrides.from || '+15555555555',
    to: overrides.to || '+15551111111',
  };
}

describe('TwilioAdapter', () => {
  let adapter: TwilioAdapter;

  beforeEach(() => {
    setTwilioEnv();
    jest.clearAllMocks();
    adapter = new TwilioAdapter();
    mockCreateCall.mockResolvedValue(makeCallInfo({ status: 'queued' }));
    mockFetchCall.mockResolvedValue(makeCallInfo({ status: 'queued' }));
    mockCancelCall.mockResolvedValue(undefined);
  });

  afterEach(() => {
    adapter.onModuleDestroy();
    clearTwilioEnv();
    delete process.env.TELEPHONY_PROVIDER;
  });

  describe('instantiation and configuration', () => {
    it('can be instantiated without throwing (lazy validation)', () => {
      clearTwilioEnv();
      expect(() => new TwilioAdapter()).not.toThrow();
    });

    it('can be instantiated with valid Twilio configuration', () => {
      expect(adapter).toBeInstanceOf(TwilioAdapter);
    });

    it('implements the TelephonyAdapter interface', () => {
      expect(typeof adapter.dial).toBe('function');
      expect(typeof adapter.cancel).toBe('function');
      expect(typeof adapter.events).toBe('function');
      expect(adapter.capabilities).toBeDefined();
    });

    it('declares correct capabilities', () => {
      expect(adapter.capabilities).toEqual({
        manualDial: true,
        cancel: true,
        hold: false,
        recording: false,
        transfer: false,
      });
    });

    it('stores validated configuration without exposing secrets', () => {
      const config = adapter.getConfig();
      expect(config.accountSid).toBe(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      expect(config.phoneNumber).toBe(VALID_TWILIO_ENV.TWILIO_PHONE_NUMBER);
      expect(config.webhookUrl).toBe(VALID_TWILIO_ENV.TWILIO_WEBHOOK_URL);
      expect(config.webhookVerify).toBe(false);
    });
  });

  describe('missing or invalid configuration', () => {
    it('throws when all Twilio env vars are missing (on getConfig)', () => {
      clearTwilioEnv();
      const a = new TwilioAdapter();
      expect(() => a.getConfig()).toThrow(InternalServerErrorException);
    });

    it('error message lists missing variables without exposing credentials', () => {
      clearTwilioEnv();
      const a = new TwilioAdapter();
      try {
        a.getConfig();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        const message = (error as InternalServerErrorException).message;
        expect(message).toContain('TWILIO_ACCOUNT_SID');
        expect(message).toContain('TWILIO_AUTH_TOKEN');
        expect(message).toContain('TWILIO_PHONE_NUMBER');
        expect(message).toContain('TWILIO_WEBHOOK_URL');
      }
    });

    it('throws when only some env vars are missing', () => {
      clearTwilioEnv();
      process.env.TWILIO_ACCOUNT_SID = VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID;
      process.env.TWILIO_AUTH_TOKEN = VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN;
      const a = new TwilioAdapter();
      try {
        a.getConfig();
        fail('Should have thrown');
      } catch (error) {
        const message = (error as InternalServerErrorException).message;
        expect(message).toContain('TWILIO_PHONE_NUMBER');
        expect(message).toContain('TWILIO_WEBHOOK_URL');
        expect(message).not.toContain('TWILIO_ACCOUNT_SID');
        expect(message).not.toContain('TWILIO_AUTH_TOKEN');
      }
    });

    it('throws when account SID does not start with AC', () => {
      process.env.TWILIO_ACCOUNT_SID = 'XX' + 'a'.repeat(30);
      const a = new TwilioAdapter();
      expect(() => a.getConfig()).toThrow(InternalServerErrorException);
    });

    it('throws when auth token is too short', () => {
      process.env.TWILIO_AUTH_TOKEN = 'short';
      const a = new TwilioAdapter();
      expect(() => a.getConfig()).toThrow(InternalServerErrorException);
    });

    it('does not expose auth token value in error messages', () => {
      clearTwilioEnv();
      process.env.TWILIO_ACCOUNT_SID = VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID;
      process.env.TWILIO_AUTH_TOKEN = 'super-secret-token-value-123456';
      const a = new TwilioAdapter();
      try {
        a.getConfig();
        fail('Should have thrown');
      } catch (error) {
        const message = (error as InternalServerErrorException).message;
        expect(message).not.toContain('super-secret-token-value-123456');
      }
    });

    it('does not expose account SID value in error messages', () => {
      clearTwilioEnv();
      process.env.TWILIO_AUTH_TOKEN = VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN;
      process.env.TWILIO_ACCOUNT_SID = 'AC' + 'b'.repeat(30);
      const a = new TwilioAdapter();
      try {
        a.getConfig();
        fail('Should have thrown');
      } catch (error) {
        const message = (error as InternalServerErrorException).message;
        expect(message).not.toContain('AC' + 'b'.repeat(30));
      }
    });
  });

  describe('dial()', () => {
    it('creates a Twilio call with correct parameters including statusCallback', async () => {
      await adapter.dial(makeCommand());
      expect(mockCreateCall).toHaveBeenCalledWith({
        to: '+15551111111',
        from: VALID_TWILIO_ENV.TWILIO_PHONE_NUMBER,
        twiml: '<Response><Dial>+15551111111</Dial></Response>',
        statusCallback: VALID_TWILIO_ENV.TWILIO_WEBHOOK_URL,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });
    });

    it('returns providerRef as the Twilio Call SID', async () => {
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA' + '9'.repeat(32) }));
      const result = await adapter.dial(makeCommand());
      expect(result.providerRef).toBe('CA' + '9'.repeat(32));
    });

    it('returns acceptedAt as a Date', async () => {
      const result = await adapter.dial(makeCommand());
      expect(result.acceptedAt).toBeInstanceOf(Date);
    });

    it('stores callId to SID mapping for cancel', async () => {
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-test-sid' }));
      await adapter.dial(makeCommand({ callId: 'call-cancel-test' }));
      mockCancelCall.mockClear();
      await adapter.cancel('call-cancel-test');
      expect(mockCancelCall).toHaveBeenCalledWith('CA-test-sid');
    });

    it('emits dialing event through the Subject', async () => {
      const events: CallEvent[] = [];
      adapter.events('call-dial-event').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-dial-event' }));
      expect(events).toHaveLength(1);
      expect(events[0].state).toBe(CallState.Dialing);
      expect(events[0].type).toBe('call.dialing');
    });

    it('throws InternalServerErrorException on SDK failure', async () => {
      mockCreateCall.mockRejectedValue(new Error('Twilio API error'));
      await expect(adapter.dial(makeCommand())).rejects.toThrow(InternalServerErrorException);
    });

    it('maps 401 authentication error to safe message', async () => {
      const err = Object.assign(new Error('Unauthorized'), { status: 401 });
      mockCreateCall.mockRejectedValue(err);
      await expect(adapter.dial(makeCommand())).rejects.toThrow('Twilio authentication failed');
    });

    it('maps 400 bad request to BadRequestException', async () => {
      const err = Object.assign(new Error('Bad request'), { status: 400 });
      mockCreateCall.mockRejectedValue(err);
      await expect(adapter.dial(makeCommand())).rejects.toThrow(BadRequestException);
    });

    it('maps 429 rate limit to safe message', async () => {
      const err = Object.assign(new Error('Too many requests'), { status: 429 });
      mockCreateCall.mockRejectedValue(err);
      await expect(adapter.dial(makeCommand())).rejects.toThrow('Twilio API rate limit exceeded');
    });

    it('does not expose credentials in error messages', async () => {
      const err = Object.assign(new Error('Some error'), { status: 500 });
      mockCreateCall.mockRejectedValue(err);
      try {
        await adapter.dial(makeCommand());
        fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
        expect(message).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      }
    });

    it('throws on missing config', async () => {
      clearTwilioEnv();
      const a = new TwilioAdapter();
      await expect(a.dial(makeCommand())).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('cancel()', () => {
    it('resolves callId to Twilio SID and cancels', async () => {
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-cancel-1' }));
      await adapter.dial(makeCommand({ callId: 'call-cancel-1' }));
      mockCancelCall.mockClear();
      await adapter.cancel('call-cancel-1');
      expect(mockCancelCall).toHaveBeenCalledWith('CA-cancel-1');
    });

    it('throws NotFoundException when callId mapping is missing', async () => {
      await expect(adapter.cancel('unknown-call')).rejects.toThrow(NotFoundException);
    });

    it('error message includes callId but not credentials', async () => {
      try {
        await adapter.cancel('unknown-call-id');
        fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('unknown-call-id');
        expect(message).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
        expect(message).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      }
    });

    it('throws on Twilio API error during cancel', async () => {
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-cancel-err' }));
      await adapter.dial(makeCommand({ callId: 'call-cancel-err' }));
      const err = Object.assign(new Error('Cancel failed'), { status: 500 });
      mockCancelCall.mockRejectedValue(err);
      await expect(adapter.cancel('call-cancel-err')).rejects.toThrow(InternalServerErrorException);
    });

    it('emits cancelled event on the Subject', async () => {
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-cancel-evt' }));
      const events: CallEvent[] = [];
      adapter.events('call-cancel-evt').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-cancel-evt' }));
      events.length = 0;
      await adapter.cancel('call-cancel-evt');
      const cancelled = events.find((e) => e.state === CallState.Cancelled);
      expect(cancelled).toBeDefined();
      expect(cancelled!.type).toBe('call.cancelled');
    });

    it('completes the Subject after cancel', async () => {
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-cancel-sub' }));
      let completed = false;
      adapter.events('call-cancel-sub').subscribe({ complete: () => { completed = true; } });
      await adapter.dial(makeCommand({ callId: 'call-cancel-sub' }));
      await adapter.cancel('call-cancel-sub');
      expect(completed).toBe(true);
    });
  });

  describe('events()', () => {
    it('returns an Observable before dial() is called', () => {
      const obs = adapter.events('call-pre-dial');
      expect(obs).toBeDefined();
      expect(typeof obs.subscribe).toBe('function');
    });

    it('returns Observables that share the same underlying Subject', async () => {
      const events1: CallEvent[] = [];
      const events2: CallEvent[] = [];
      adapter.events('call-same').subscribe((e) => events1.push(e));
      adapter.events('call-same').subscribe((e) => events2.push(e));
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-same' }));
      await adapter.dial(makeCommand({ callId: 'call-same' }));
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events1[0]).toEqual(events2[0]);
    });

    it('does not throw on missing config (called before dial)', () => {
      clearTwilioEnv();
      const a = new TwilioAdapter();
      expect(() => a.events('call-no-config')).not.toThrow();
    });

    it('works correctly when called before dial()', async () => {
      const events: CallEvent[] = [];
      adapter.events('call-order-test').subscribe((e) => events.push(e));
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-order' }));
      await adapter.dial(makeCommand({ callId: 'call-order-test' }));
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].state).toBe(CallState.Dialing);
    });
  });

  describe('polling and status mapping', () => {
    it('emits ringing state when Twilio returns ringing', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-ring', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-ring', status: 'ringing' }));
      const events: CallEvent[] = [];
      adapter.events('call-ring').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-ring' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const ringing = events.find((e) => e.state === CallState.Ringing);
      expect(ringing).toBeDefined();
      expect(ringing!.type).toBe('call.ringing');
      jest.useRealTimers();
    });

    it('emits connected state when Twilio returns in-progress', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-conn', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-conn', status: 'in-progress' }));
      const events: CallEvent[] = [];
      adapter.events('call-conn').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-conn' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const connected = events.find((e) => e.state === CallState.Connected);
      expect(connected).toBeDefined();
      expect(connected!.type).toBe('call.connected');
      jest.useRealTimers();
    });

    it('emits completed state when Twilio returns completed', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-comp', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-comp', status: 'completed', duration: '30' }));
      const events: CallEvent[] = [];
      adapter.events('call-comp').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-comp' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const completed = events.find((e) => e.state === CallState.Completed);
      expect(completed).toBeDefined();
      expect(completed!.type).toBe('call.completed');
      jest.useRealTimers();
    });

    it('does not emit duplicate state events', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-dup', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-dup', status: 'ringing' }));
      const events: CallEvent[] = [];
      adapter.events('call-dup').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-dup' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const ringingCount = events.filter((e) => e.state === CallState.Ringing).length;
      expect(ringingCount).toBe(1);
      jest.useRealTimers();
    });

    it('stops polling on terminal state', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-term', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-term', status: 'completed' }));
      const events: CallEvent[] = [];
      adapter.events('call-term').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-term' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      mockFetchCall.mockClear();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      expect(mockFetchCall).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('completes Subject on terminal state', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-term-sub', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-term-sub', status: 'completed' }));
      let completed = false;
      adapter.events('call-term-sub').subscribe({ complete: () => { completed = true; } });
      await adapter.dial(makeCommand({ callId: 'call-term-sub' }));
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      expect(completed).toBe(true);
      jest.useRealTimers();
    });

    it('skips queued status from polling', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-skip-q', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-skip-q', status: 'queued' }));
      const events: CallEvent[] = [];
      adapter.events('call-skip-q').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-skip-q' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      expect(events).toHaveLength(0);
      jest.useRealTimers();
    });

    it('handles unknown Twilio status without crashing', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-unknown', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-unknown', status: 'unknown-status' }));
      const events: CallEvent[] = [];
      adapter.events('call-unknown').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-unknown' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      expect(events).toHaveLength(0);
      jest.useRealTimers();
    });

    it('continues polling after a fetch error', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-err', status: 'queued' }));
      mockFetchCall.mockRejectedValueOnce(new Error('Network error'));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-err', status: 'ringing' }));
      const events: CallEvent[] = [];
      adapter.events('call-err').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-err' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const ringing = events.find((e) => e.state === CallState.Ringing);
      expect(ringing).toBeDefined();
      jest.useRealTimers();
    });

    it('isolates events between different calls', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValueOnce(makeCallInfo({ sid: 'CA-iso-1', status: 'queued' }));
      mockCreateCall.mockResolvedValueOnce(makeCallInfo({ sid: 'CA-iso-2', status: 'queued' }));
      const events1: CallEvent[] = [];
      const events2: CallEvent[] = [];
      adapter.events('call-iso-1').subscribe((e) => events1.push(e));
      adapter.events('call-iso-2').subscribe((e) => events2.push(e));
      await adapter.dial(makeCommand({ callId: 'call-iso-1' }));
      await adapter.dial(makeCommand({ callId: 'call-iso-2' }));
      expect(events1.every((e) => e.callId === 'call-iso-1')).toBe(true);
      expect(events2.every((e) => e.callId === 'call-iso-2')).toBe(true);
      jest.useRealTimers();
    });
  });

  describe('CallFailure handling', () => {
    it('populates CallFailure for busy state', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-busy', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-busy', status: 'busy' }));
      const events: CallEvent[] = [];
      adapter.events('call-busy').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-busy' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const busy = events.find((e) => e.state === CallState.Busy);
      expect(busy).toBeDefined();
      expect(busy!.failure).toBeDefined();
      expect(busy!.failure!.code).toBe('TWILIO_BUSY');
      expect(busy!.failure!.retryable).toBe(true);
      jest.useRealTimers();
    });

    it('populates CallFailure for failed state', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-fail', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-fail', status: 'failed' }));
      const events: CallEvent[] = [];
      adapter.events('call-fail').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-fail' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const failed = events.find((e) => e.state === CallState.Failed);
      expect(failed).toBeDefined();
      expect(failed!.failure).toBeDefined();
      expect(failed!.failure!.code).toBe('TWILIO_FAILED');
      expect(failed!.failure!.retryable).toBe(false);
      jest.useRealTimers();
    });

    it('populates CallFailure for no-answer state', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-na', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-na', status: 'no-answer' }));
      const events: CallEvent[] = [];
      adapter.events('call-na').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-na' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const noAnswer = events.find((e) => e.state === CallState.NoAnswer);
      expect(noAnswer).toBeDefined();
      expect(noAnswer!.failure).toBeDefined();
      expect(noAnswer!.failure!.code).toBe('TWILIO_NO_ANSWER');
      expect(noAnswer!.failure!.retryable).toBe(true);
      jest.useRealTimers();
    });

    it('populates CallFailure for cancelled state', async () => {
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-can' }));
      const events: CallEvent[] = [];
      adapter.events('call-can').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-can' }));
      events.length = 0;
      await adapter.cancel('call-can');
      const cancelled = events.find((e) => e.state === CallState.Cancelled);
      expect(cancelled).toBeDefined();
      expect(cancelled!.failure).toBeDefined();
      expect(cancelled!.failure!.code).toBe('TWILIO_CANCELLED');
      expect(cancelled!.failure!.retryable).toBe(false);
    });

    it('does not populate CallFailure for non-failure states', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-nf', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-nf', status: 'ringing' }));
      const events: CallEvent[] = [];
      adapter.events('call-nf').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-nf' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const ringing = events.find((e) => e.state === CallState.Ringing);
      expect(ringing).toBeDefined();
      expect(ringing!.failure).toBeUndefined();
      jest.useRealTimers();
    });

    it('does not expose credentials in CallFailure', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-sec', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-sec', status: 'failed' }));
      const events: CallEvent[] = [];
      adapter.events('call-sec').subscribe((e) => events.push(e));
      await adapter.dial(makeCommand({ callId: 'call-sec' }));
      events.length = 0;
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();
      const failed = events.find((e) => e.state === CallState.Failed);
      expect(failed).toBeDefined();
      expect(failed!.failure).toBeDefined();
      expect(JSON.stringify(failed!.failure)).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
      expect(JSON.stringify(failed!.failure)).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      jest.useRealTimers();
    });
  });

  describe('security', () => {
    it('does not expose credentials in dial error messages', async () => {
      mockCreateCall.mockRejectedValue(new Error('Some API error'));
      try {
        await adapter.dial(makeCommand());
        fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
        expect(message).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      }
    });

    it('does not expose credentials in cancel error messages', async () => {
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-sec-can' }));
      await adapter.dial(makeCommand({ callId: 'call-sec-can' }));
      const err = Object.assign(new Error('Cancel error'), { status: 500 });
      mockCancelCall.mockRejectedValue(err);
      try {
        await adapter.cancel('call-sec-can');
        fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
        expect(message).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      }
    });

    it('does not expose credentials in event payloads', async () => {
      const events: CallEvent[] = [];
      adapter.events('call-sec-evt').subscribe((e) => events.push(e));
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-sec-evt' }));
      await adapter.dial(makeCommand({ callId: 'call-sec-evt' }));
      for (const event of events) {
        expect(JSON.stringify(event)).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
        expect(JSON.stringify(event)).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      }
    });
  });

  describe('ingestWebhookEvent()', () => {
    it('emits ringing event from webhook and returns true', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-1').subscribe((e) => events.push(e));

      const emitted = adapter.ingestWebhookEvent({
        callId: 'call-wh-1',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-1',
        twilioStatus: 'ringing',
      });

      expect(emitted).toBe(true);
      expect(events.some((e) => e.state === CallState.Ringing)).toBe(true);
    });

    it('emits connected event from webhook', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-2').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-2',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-2',
        twilioStatus: 'in-progress',
      });

      expect(events.some((e) => e.state === CallState.Connected)).toBe(true);
    });

    it('emits completed terminal event and cleans up', () => {
      let completed = false;
      adapter.events('call-wh-3').subscribe({ complete: () => { completed = true; } });

      const emitted = adapter.ingestWebhookEvent({
        callId: 'call-wh-3',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-3',
        twilioStatus: 'completed',
      });

      expect(emitted).toBe(true);
      expect(completed).toBe(true);
    });

    it('emits busy terminal event', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-4').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-4',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-4',
        twilioStatus: 'busy',
      });

      expect(events.some((e) => e.state === CallState.Busy)).toBe(true);
    });

    it('emits failed terminal event', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-5').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-5',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-5',
        twilioStatus: 'failed',
      });

      expect(events.some((e) => e.state === CallState.Failed)).toBe(true);
    });

    it('emits no-answer terminal event', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-6').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-6',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-6',
        twilioStatus: 'no-answer',
      });

      expect(events.some((e) => e.state === CallState.NoAnswer)).toBe(true);
    });

    it('emits canceled terminal event', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-7').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-7',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-7',
        twilioStatus: 'canceled',
      });

      expect(events.some((e) => e.state === CallState.Cancelled)).toBe(true);
    });

    it('emits dialing event from initiated status', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-8').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-8',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-8',
        twilioStatus: 'initiated',
      });

      expect(events.some((e) => e.state === CallState.Dialing)).toBe(true);
    });

    it('returns false for queued status (skipped)', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-skip').subscribe((e) => events.push(e));

      const emitted = adapter.ingestWebhookEvent({
        callId: 'call-wh-skip',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-skip',
        twilioStatus: 'queued',
      });

      expect(emitted).toBe(false);
      expect(events).toHaveLength(0);
    });

    it('returns false for unknown Twilio status', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-unknown').subscribe((e) => events.push(e));

      const emitted = adapter.ingestWebhookEvent({
        callId: 'call-wh-unknown',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-unknown',
        twilioStatus: 'unknown-status',
      });

      expect(emitted).toBe(false);
      expect(events).toHaveLength(0);
    });

    it('suppresses duplicate webhook event (same state emitted twice)', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-dup').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-dup',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-dup',
        twilioStatus: 'ringing',
      });

      const emitted2 = adapter.ingestWebhookEvent({
        callId: 'call-wh-dup',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-dup',
        twilioStatus: 'ringing',
      });

      expect(emitted2).toBe(false);
      const ringingEvents = events.filter((e) => e.state === CallState.Ringing);
      expect(ringingEvents).toHaveLength(1);
    });

    it('works without prior dial() — creates Subject on demand', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-nodial').subscribe((e) => events.push(e));

      const emitted = adapter.ingestWebhookEvent({
        callId: 'call-wh-nodial',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-nodial',
        twilioStatus: 'ringing',
      });

      expect(emitted).toBe(true);
      expect(events.some((e) => e.state === CallState.Ringing)).toBe(true);
    });

    it('populates CallFailure for failure states from webhook', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-fail').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-fail',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-fail',
        twilioStatus: 'failed',
      });

      const failed = events.find((e) => e.state === CallState.Failed);
      expect(failed).toBeDefined();
      expect(failed!.failure).toBeDefined();
      expect(failed!.failure!.code).toBe('TWILIO_FAILED');
    });

    it('does not expose credentials in webhook event payloads', () => {
      const events: CallEvent[] = [];
      adapter.events('call-wh-sec').subscribe((e) => events.push(e));

      adapter.ingestWebhookEvent({
        callId: 'call-wh-sec',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-sec',
        twilioStatus: 'completed',
      });

      for (const event of events) {
        expect(JSON.stringify(event)).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
        expect(JSON.stringify(event)).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      }
    });

    it('coexists with polling without duplicate events', async () => {
      jest.useFakeTimers();
      mockCreateCall.mockResolvedValue(makeCallInfo({ sid: 'CA-wh-coexist', status: 'queued' }));
      mockFetchCall.mockResolvedValue(makeCallInfo({ sid: 'CA-wh-coexist', status: 'ringing' }));

      const events: CallEvent[] = [];
      adapter.events('call-wh-coexist').subscribe((e) => events.push(e));

      await adapter.dial(makeCommand({ callId: 'call-wh-coexist' }));
      events.length = 0;

      // Webhook arrives first with ringing
      adapter.ingestWebhookEvent({
        callId: 'call-wh-coexist',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        sid: 'CA-wh-coexist',
        twilioStatus: 'ringing',
      });

      // Polling fires — should be suppressed (same state)
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve();

      const ringingCount = events.filter((e) => e.state === CallState.Ringing).length;
      expect(ringingCount).toBe(1);
      jest.useRealTimers();
    });
  });
});

describe('TwilioAdapter + ProviderRegistry integration', () => {
  afterEach(() => {
    clearTwilioEnv();
    delete process.env.TELEPHONY_PROVIDER;
  });

  it('TELEPHONY_PROVIDER=mock still resolves MockTelephonyAdapter', () => {
    process.env.TELEPHONY_PROVIDER = 'mock';
    const registry = new ProviderRegistryImpl();
    const mockAdapter = new MockTelephonyAdapter();
    registry.register('mock', mockAdapter);
    expect(registry.resolve()).toBe(mockAdapter);
  });

  it('TELEPHONY_PROVIDER=twilio resolves TwilioAdapter', () => {
    setTwilioEnv();
    process.env.TELEPHONY_PROVIDER = 'twilio';
    const registry = new ProviderRegistryImpl();
    const twilioAdapter = new TwilioAdapter();
    registry.register('twilio', twilioAdapter);
    expect(registry.resolve()).toBe(twilioAdapter);
  });

  it('does not silently fall back from twilio to mock', () => {
    setTwilioEnv();
    process.env.TELEPHONY_PROVIDER = 'twilio';
    const registry = new ProviderRegistryImpl();
    registry.register('mock', new MockTelephonyAdapter());
    expect(() => registry.resolve()).toThrow(/no adapter was registered for it/);
  });

  it('both adapters registered and correct one resolved', () => {
    setTwilioEnv();
    process.env.TELEPHONY_PROVIDER = 'twilio';
    const registry = new ProviderRegistryImpl();
    const mockAdapter = new MockTelephonyAdapter();
    const twilioAdapter = new TwilioAdapter();
    registry.register('mock', mockAdapter);
    registry.register('twilio', twilioAdapter);
    expect(registry.resolve()).toBe(twilioAdapter);
    expect(registry.getProviderKey()).toBe('twilio');
  });

  it('switching to mock still works after twilio is registered', () => {
    setTwilioEnv();
    process.env.TELEPHONY_PROVIDER = 'mock';
    const registry = new ProviderRegistryImpl();
    const mockAdapter = new MockTelephonyAdapter();
    const twilioAdapter = new TwilioAdapter();
    registry.register('mock', mockAdapter);
    registry.register('twilio', twilioAdapter);
    expect(registry.resolve()).toBe(mockAdapter);
    expect(registry.getProviderKey()).toBe('mock');
  });

  it('resolved TwilioAdapter satisfies TelephonyAdapter interface', () => {
    setTwilioEnv();
    process.env.TELEPHONY_PROVIDER = 'twilio';
    const registry = new ProviderRegistryImpl();
    const twilioAdapter = new TwilioAdapter();
    registry.register('twilio', twilioAdapter);
    const resolved: TelephonyAdapter = registry.resolve();
    expect(typeof resolved.dial).toBe('function');
    expect(typeof resolved.cancel).toBe('function');
    expect(typeof resolved.events).toBe('function');
    expect(resolved.capabilities.manualDial).toBe(true);
    expect(resolved.capabilities.cancel).toBe(true);
  });
});

describe('Twilio status mapping', () => {
  it('maps all expected Twilio statuses to internal CallState values', () => {
    expect(TWILIO_STATUS_MAP['queued']).toBe(CallState.Queued);
    expect(TWILIO_STATUS_MAP['initiated']).toBe(CallState.Dialing);
    expect(TWILIO_STATUS_MAP['ringing']).toBe(CallState.Ringing);
    expect(TWILIO_STATUS_MAP['in-progress']).toBe(CallState.Connected);
    expect(TWILIO_STATUS_MAP['completed']).toBe(CallState.Completed);
    expect(TWILIO_STATUS_MAP['busy']).toBe(CallState.Busy);
    expect(TWILIO_STATUS_MAP['failed']).toBe(CallState.Failed);
    expect(TWILIO_STATUS_MAP['no-answer']).toBe(CallState.NoAnswer);
    expect(TWILIO_STATUS_MAP['canceled']).toBe(CallState.Cancelled);
  });
});
