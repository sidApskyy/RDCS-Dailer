jest.mock('./twilio.client');
jest.mock('./twilio-signature.service');

import { CallState } from './telephony.types';
import { TwilioSignatureService } from './twilio-signature.service';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { TwilioAdapter } from './twilio.adapter';
import { TwilioClient } from './twilio.client';
import { TWILIO_STATUS_MAP } from './twilio.types';

const VALID_TWILIO_ENV = {
  TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(30),
  TWILIO_AUTH_TOKEN: 'x'.repeat(32),
  TWILIO_PHONE_NUMBER: '+15555555555',
  TWILIO_WEBHOOK_URL: 'http://localhost:3001/webhooks/twilio/status',
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

function makeCallSession(overrides: Partial<{ id: string; tenantId: string; agentId: string; state: string; providerRef: string; attemptId: string }> = {}) {
  return {
    id: overrides.id || 'call-1',
    tenantId: overrides.tenantId || 'tenant-1',
    agentId: overrides.agentId || 'agent-1',
    state: overrides.state || CallState.Dialing,
    providerRef: overrides.providerRef || 'CA' + '1'.repeat(32),
    attemptId: overrides.attemptId || 'attempt-1',
  };
}

function makeWebhookBody(overrides: Partial<{ CallSid: string; CallStatus: string; CallDuration: string; From: string; To: string; Direction: string }> = {}) {
  return {
    CallSid: overrides.CallSid || 'CA' + '1'.repeat(32),
    CallStatus: overrides.CallStatus || 'ringing',
    CallDuration: overrides.CallDuration || '',
    From: overrides.From || '+15555555555',
    To: overrides.To || '+15551111111',
    Direction: overrides.Direction || 'outbound-api',
  };
}

describe('TwilioWebhookController', () => {
  let controller: TwilioWebhookController;
  let adapter: TwilioAdapter;
  let prismaMock: { callSession: { findFirst: jest.Mock; update: jest.Mock }; leadAttempt: { update: jest.Mock }; audit: { create: jest.Mock } };
  let signatureService: jest.Mocked<TwilioSignatureService>;
  let loggerMock: { log: jest.Mock; warn: jest.Mock; debug: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    setTwilioEnv();
    jest.clearAllMocks();
    mockCreateCall.mockResolvedValue({ sid: 'CA' + '1'.repeat(32), status: 'queued', duration: null, from: '+15555555555', to: '+15551111111' });
    mockFetchCall.mockResolvedValue({ sid: 'CA' + '1'.repeat(32), status: 'queued', duration: null, from: '+15555555555', to: '+15551111111' });
    mockCancelCall.mockResolvedValue(undefined);

    adapter = new TwilioAdapter();

    prismaMock = {
      callSession: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      leadAttempt: {
        update: jest.fn().mockResolvedValue({}),
      },
      audit: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    signatureService = new TwilioSignatureService() as jest.Mocked<TwilioSignatureService>;
    signatureService.validateRequest = jest.fn().mockReturnValue(true);

    loggerMock = {
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    controller = new TwilioWebhookController(
      prismaMock as unknown as never,
      adapter,
      signatureService,
      loggerMock as unknown as never,
    );
  });

  afterEach(() => {
    adapter.onModuleDestroy();
    clearTwilioEnv();
    delete process.env.TELEPHONY_PROVIDER;
  });

  describe('handleStatusCallback — valid signature', () => {
    it('processes a ringing status callback and emits event', async () => {
      const callSession = makeCallSession({ state: CallState.Dialing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'ringing' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(events.some((e) => e.state === CallState.Ringing)).toBe(true);
    });

    it('processes a completed status callback with duration', async () => {
      const callSession = makeCallSession({ state: CallState.Connected });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);
      prismaMock.callSession.update.mockResolvedValue({});

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'completed', CallDuration: '45' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(prismaMock.callSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'call-1' },
          data: expect.objectContaining({ state: CallState.Completed, duration: 45 }),
        }),
      );
      expect(prismaMock.audit.create).toHaveBeenCalled();
    });

    it('processes a busy status callback as terminal', async () => {
      const callSession = makeCallSession({ state: CallState.Dialing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'busy' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(events.some((e) => e.state === CallState.Busy)).toBe(true);
    });

    it('processes a failed status callback as terminal', async () => {
      const callSession = makeCallSession({ state: CallState.Dialing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'failed' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(events.some((e) => e.state === CallState.Failed)).toBe(true);
    });

    it('processes a no-answer status callback as terminal', async () => {
      const callSession = makeCallSession({ state: CallState.Ringing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'no-answer' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(events.some((e) => e.state === CallState.NoAnswer)).toBe(true);
    });

    it('processes a canceled status callback as terminal', async () => {
      const callSession = makeCallSession({ state: CallState.Dialing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'canceled' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(events.some((e) => e.state === CallState.Cancelled)).toBe(true);
    });

    it('processes an in-progress status callback as connected', async () => {
      const callSession = makeCallSession({ state: CallState.Ringing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'in-progress' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(events.some((e) => e.state === CallState.Connected)).toBe(true);
    });

    it('processes an initiated status callback as dialing', async () => {
      const callSession = makeCallSession({ state: CallState.Queued });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'initiated' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(events.some((e) => e.state === CallState.Dialing)).toBe(true);
    });
  });

  describe('handleStatusCallback — invalid signature', () => {
    it('rejects webhook with invalid signature', async () => {
      signatureService.validateRequest.mockReturnValue(false);

      const result = await controller.handleStatusCallback(
        makeWebhookBody(),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('rejected');
      expect(prismaMock.callSession.findFirst).not.toHaveBeenCalled();
    });

    it('rejects webhook with missing signature when verification is enabled', async () => {
      process.env.TWILIO_WEBHOOK_VERIFY = 'true';
      // Need to create a new adapter to pick up the new env
      adapter.onModuleDestroy();
      adapter = new TwilioAdapter();
      controller = new TwilioWebhookController(
        prismaMock as unknown as never,
        adapter,
        signatureService,
        loggerMock as unknown as never,
      );
      signatureService.validateRequest.mockReturnValue(false);

      const result = await controller.handleStatusCallback(
        makeWebhookBody(),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('rejected');
    });
  });

  describe('handleStatusCallback — unknown CallSid', () => {
    it('returns ignored for unknown CallSid', async () => {
      prismaMock.callSession.findFirst.mockResolvedValue(null);

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallSid: 'CA' + '9'.repeat(32) }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('ignored');
    });

    it('does not crash for unknown CallSid', async () => {
      prismaMock.callSession.findFirst.mockResolvedValue(null);

      await expect(
        controller.handleStatusCallback(
          makeWebhookBody({ CallSid: 'CA-unknown-sid' }),
          {},
          { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('handleStatusCallback — malformed payload', () => {
    it('returns ignored for missing CallSid', async () => {
      const result = await controller.handleStatusCallback(
        { CallStatus: 'ringing' },
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('ignored');
    });

    it('returns ignored for missing CallStatus', async () => {
      const result = await controller.handleStatusCallback(
        { CallSid: 'CA' + '1'.repeat(32) },
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('ignored');
    });

    it('returns ignored for empty body', async () => {
      const result = await controller.handleStatusCallback(
        {},
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('ignored');
    });
  });

  describe('handleStatusCallback — idempotency', () => {
    it('returns duplicate for same state as current DB state', async () => {
      const callSession = makeCallSession({ state: CallState.Ringing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'ringing' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('duplicate');
      expect(prismaMock.callSession.update).not.toHaveBeenCalled();
    });

    it('suppresses duplicate webhook event from adapter (same state emitted twice)', async () => {
      const callSession = makeCallSession({ state: CallState.Dialing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const events: import('./telephony.types').CallEvent[] = [];
      adapter.events('call-1').subscribe((e) => events.push(e));

      // First webhook — ringing
      await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'ringing' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      // Update DB state to ringing for second call
      prismaMock.callSession.findFirst.mockResolvedValue(makeCallSession({ state: CallState.Ringing }));

      // Second webhook — ringing again (duplicate)
      const result2 = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'ringing' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result2.status).toBe('duplicate');
      const ringingEvents = events.filter((e) => e.state === CallState.Ringing);
      expect(ringingEvents).toHaveLength(1);
    });

    it('handles out-of-order webhook: terminal state not overwritten by stale non-terminal', async () => {
      // Call is already completed in DB
      const callSession = makeCallSession({ state: CallState.Completed });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      // Stale webhook arrives with ringing status
      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'ringing' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      // The DB state is Completed, the webhook says Ringing — different states, so not "duplicate"
      // But the adapter's lastEmittedStates should suppress it (Completed was already emitted)
      // The state machine in TelephonyService would also reject Completed → Ringing
      expect(result.status).toMatch(/processed|suppressed/);
      // No DB update for non-terminal webhook
      expect(prismaMock.callSession.update).not.toHaveBeenCalled();
    });
  });

  describe('handleStatusCallback — terminal state handling', () => {
    it('updates DB with completedAt for terminal states', async () => {
      const callSession = makeCallSession({ state: CallState.Connected });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'completed', CallDuration: '30' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(prismaMock.callSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'call-1' },
          data: expect.objectContaining({
            state: CallState.Completed,
            completedAt: expect.any(Date),
            terminationReason: CallState.Completed,
          }),
        }),
      );
    });

    it('creates audit log for terminal state', async () => {
      const callSession = makeCallSession({ state: CallState.Connected });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'completed' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(prismaMock.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            userId: 'agent-1',
            action: 'call.completed',
            resource: 'CallSession',
            resourceId: 'call-1',
            metadata: expect.objectContaining({ source: 'webhook' }),
          }),
        }),
      );
    });

    it('updates lead attempt for completed call with duration', async () => {
      const callSession = makeCallSession({ state: CallState.Connected, attemptId: 'attempt-1' });
      prismaMock.callSession.findFirst.mockResolvedValueOnce(callSession);
      prismaMock.callSession.findFirst.mockResolvedValueOnce({ attemptId: 'attempt-1' });

      await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'completed', CallDuration: '60' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(prismaMock.leadAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'attempt-1' },
          data: expect.objectContaining({ outcome: CallState.Completed, duration: 60 }),
        }),
      );
    });
  });

  describe('handleStatusCallback — skipped statuses', () => {
    it('skips queued status', async () => {
      const callSession = makeCallSession({ state: CallState.Queued });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'queued' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('skipped');
    });

    it('skips unknown Twilio status', async () => {
      const callSession = makeCallSession({ state: CallState.Dialing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'unknown-status' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('skipped');
    });
  });

  describe('handleStatusCallback — security', () => {
    it('does not expose credentials in response', async () => {
      const callSession = makeCallSession({ state: CallState.Dialing });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallStatus: 'ringing' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
      expect(resultStr).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
    });

    it('does not log credentials on signature failure', async () => {
      signatureService.validateRequest.mockReturnValue(false);

      await controller.handleStatusCallback(
        makeWebhookBody(),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      const warnCall = loggerMock.warn.mock.calls[0];
      if (warnCall) {
        const logStr = JSON.stringify(warnCall);
        expect(logStr).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
        expect(logStr).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      }
    });

    it('does not log credentials on unknown CallSid', async () => {
      prismaMock.callSession.findFirst.mockResolvedValue(null);

      await controller.handleStatusCallback(
        makeWebhookBody({ CallSid: 'CA-unknown' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      const debugCall = loggerMock.debug.mock.calls[0];
      if (debugCall) {
        const logStr = JSON.stringify(debugCall);
        expect(logStr).not.toContain(VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN);
        expect(logStr).not.toContain(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      }
    });
  });

  describe('handleStatusCallback — works after process restart (DB-based correlation)', () => {
    it('resolves callId from DB providerRef, not in-memory map', async () => {
      const callSession = makeCallSession({
        id: 'call-restart',
        providerRef: 'CA' + '7'.repeat(32),
        state: CallState.Dialing,
      });
      prismaMock.callSession.findFirst.mockResolvedValue(callSession);

      // Create a fresh adapter (simulating restart — no in-memory state)
      adapter.onModuleDestroy();
      const freshAdapter = new TwilioAdapter();
      controller = new TwilioWebhookController(
        prismaMock as unknown as never,
        freshAdapter,
        signatureService,
        loggerMock as unknown as never,
      );

      const events: import('./telephony.types').CallEvent[] = [];
      freshAdapter.events('call-restart').subscribe((e) => events.push(e));

      const result = await controller.handleStatusCallback(
        makeWebhookBody({ CallSid: 'CA' + '7'.repeat(32), CallStatus: 'ringing' }),
        {},
        { originalUrl: '/webhooks/twilio/status', protocol: 'http', headers: {}, get: () => 'localhost' } as never,
      );

      expect(result.status).toBe('processed');
      expect(events.some((e) => e.state === CallState.Ringing)).toBe(true);
      freshAdapter.onModuleDestroy();
    });
  });

  describe('handleStatusCallback — all Twilio status mappings', () => {
    const statuses = [
      { twilio: 'initiated', internal: CallState.Dialing },
      { twilio: 'ringing', internal: CallState.Ringing },
      { twilio: 'in-progress', internal: CallState.Connected },
      { twilio: 'completed', internal: CallState.Completed },
      { twilio: 'busy', internal: CallState.Busy },
      { twilio: 'failed', internal: CallState.Failed },
      { twilio: 'no-answer', internal: CallState.NoAnswer },
      { twilio: 'canceled', internal: CallState.Cancelled },
    ];

    for (const { twilio, internal } of statuses) {
      it(`maps Twilio "${twilio}" to CallState.${internal}`, async () => {
        expect(TWILIO_STATUS_MAP[twilio]).toBe(internal);
      });
    }
  });
});
