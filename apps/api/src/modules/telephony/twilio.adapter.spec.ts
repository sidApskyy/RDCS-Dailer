import { InternalServerErrorException } from '@nestjs/common';

import { MockTelephonyAdapter } from './mock-telephony.adapter';
import { ProviderRegistryImpl } from './provider-registry.service';
import { TelephonyAdapter } from './telephony.adapter';
import { CallState } from './telephony.types';
import { TwilioAdapter } from './twilio.adapter';
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

describe('TwilioAdapter (Phase 5.2.1 Stub)', () => {
  afterEach(() => {
    clearTwilioEnv();
    delete process.env.TELEPHONY_PROVIDER;
  });

  describe('instantiation with valid configuration', () => {
    it('can be instantiated without throwing (lazy validation)', () => {
      clearTwilioEnv();
      const adapter = new TwilioAdapter();
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(TwilioAdapter);
    });

    it('can be instantiated with valid Twilio configuration', () => {
      setTwilioEnv();
      const adapter = new TwilioAdapter();
      expect(adapter).toBeDefined();
      expect(adapter).toBeInstanceOf(TwilioAdapter);
    });

    it('implements the TelephonyAdapter interface', () => {
      setTwilioEnv();
      const adapter = new TwilioAdapter();
      expect(typeof adapter.dial).toBe('function');
      expect(typeof adapter.cancel).toBe('function');
      expect(typeof adapter.events).toBe('function');
      expect(adapter.capabilities).toBeDefined();
    });

    it('declares capabilities matching the stub scope', () => {
      setTwilioEnv();
      const adapter = new TwilioAdapter();
      expect(adapter.capabilities).toEqual({
        manualDial: true,
        cancel: true,
        hold: false,
        recording: false,
        transfer: false,
      });
    });

    it('stores validated configuration without exposing secrets', () => {
      setTwilioEnv();
      const adapter = new TwilioAdapter();
      const config = adapter.getConfig();
      expect(config.accountSid).toBe(VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID);
      expect(config.phoneNumber).toBe(VALID_TWILIO_ENV.TWILIO_PHONE_NUMBER);
      expect(config.webhookUrl).toBe(VALID_TWILIO_ENV.TWILIO_WEBHOOK_URL);
      expect(config.webhookVerify).toBe(false);
    });
  });

  describe('missing Twilio configuration fails clearly', () => {
    it('throws when all Twilio env vars are missing (on getConfig)', () => {
      clearTwilioEnv();
      const adapter = new TwilioAdapter();
      expect(() => adapter.getConfig()).toThrow(InternalServerErrorException);
    });

    it('error message lists missing variables without exposing credentials', () => {
      clearTwilioEnv();
      const adapter = new TwilioAdapter();
      try {
        adapter.getConfig();
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

    it('throws when only some env vars are missing (on getConfig)', () => {
      clearTwilioEnv();
      process.env.TWILIO_ACCOUNT_SID = VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID;
      process.env.TWILIO_AUTH_TOKEN = VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN;
      // TWILIO_PHONE_NUMBER and TWILIO_WEBHOOK_URL missing
      const adapter = new TwilioAdapter();
      try {
        adapter.getConfig();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        const message = (error as InternalServerErrorException).message;
        expect(message).toContain('TWILIO_PHONE_NUMBER');
        expect(message).toContain('TWILIO_WEBHOOK_URL');
        expect(message).not.toContain('TWILIO_ACCOUNT_SID');
        expect(message).not.toContain('TWILIO_AUTH_TOKEN');
      }
    });
  });

  describe('invalid Twilio configuration fails clearly', () => {
    it('throws when account SID does not start with AC', () => {
      setTwilioEnv();
      process.env.TWILIO_ACCOUNT_SID = 'XX' + 'a'.repeat(30);
      const adapter = new TwilioAdapter();
      try {
        adapter.getConfig();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        const message = (error as InternalServerErrorException).message;
        expect(message).toContain('AC');
      }
    });

    it('throws when auth token is too short', () => {
      setTwilioEnv();
      process.env.TWILIO_AUTH_TOKEN = 'short';
      const adapter = new TwilioAdapter();
      try {
        adapter.getConfig();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        const message = (error as InternalServerErrorException).message;
        expect(message).toContain('32 characters');
      }
    });
  });

  describe('credentials are not exposed in error messages', () => {
    it('error message does not contain auth token value', () => {
      clearTwilioEnv();
      process.env.TWILIO_ACCOUNT_SID = VALID_TWILIO_ENV.TWILIO_ACCOUNT_SID;
      process.env.TWILIO_AUTH_TOKEN = 'super-secret-token-value-123456';
      // Missing phone and webhook — error should list names, not values
      const adapter = new TwilioAdapter();
      try {
        adapter.getConfig();
        fail('Should have thrown');
      } catch (error) {
        const message = (error as InternalServerErrorException).message;
        expect(message).not.toContain('super-secret-token-value-123456');
      }
    });

    it('error message does not contain account SID value', () => {
      clearTwilioEnv();
      process.env.TWILIO_AUTH_TOKEN = VALID_TWILIO_ENV.TWILIO_AUTH_TOKEN;
      process.env.TWILIO_ACCOUNT_SID = 'AC' + 'b'.repeat(30);
      // Missing phone and webhook
      const adapter = new TwilioAdapter();
      try {
        adapter.getConfig();
        fail('Should have thrown');
      } catch (error) {
        const message = (error as InternalServerErrorException).message;
        expect(message).not.toContain('AC' + 'b'.repeat(30));
      }
    });
  });

  describe('stub methods throw InternalServerErrorException', () => {
    it('dial() throws with clear not-implemented message', async () => {
      setTwilioEnv();
      const adapter = new TwilioAdapter();
      await expect(
        adapter.dial({
          callId: 'call-1',
          tenantId: 'tenant-1',
          agentId: 'agent-1',
          leadId: 'lead-1',
          phoneNumber: '+15555555555',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('cancel() throws with clear not-implemented message', async () => {
      setTwilioEnv();
      const adapter = new TwilioAdapter();
      await expect(adapter.cancel('call-1')).rejects.toThrow(InternalServerErrorException);
    });

    it('events() throws with clear not-implemented message', () => {
      setTwilioEnv();
      const adapter = new TwilioAdapter();
      expect(() => adapter.events('call-1')).toThrow(InternalServerErrorException);
    });

    it('all stub error messages mention Phase 5.2.1', async () => {
      setTwilioEnv();
      const adapter = new TwilioAdapter();
      const command = {
        callId: 'call-1',
        tenantId: 'tenant-1',
        agentId: 'agent-1',
        leadId: 'lead-1',
        phoneNumber: '+15555555555',
      };

      // dial
      await expect(adapter.dial(command)).rejects.toThrow('Phase 5.2.1');
      // cancel
      await expect(adapter.cancel('call-1')).rejects.toThrow('Phase 5.2.1');
      // events
      expect(() => adapter.events('call-1')).toThrow('Phase 5.2.1');
    });
  });

  describe('lazy validation does not block instantiation', () => {
    it('can be instantiated without any Twilio env vars', () => {
      clearTwilioEnv();
      expect(() => new TwilioAdapter()).not.toThrow();
    });

    it('does not throw when TELEPHONY_PROVIDER=mock and no Twilio env vars', () => {
      clearTwilioEnv();
      process.env.TELEPHONY_PROVIDER = 'mock';
      expect(() => new TwilioAdapter()).not.toThrow();
    });

    it('throws only when a method is called without config', async () => {
      clearTwilioEnv();
      const adapter = new TwilioAdapter();
      // Constructor did not throw — good
      // But calling dial should throw config error
      await expect(
        adapter.dial({
          callId: 'call-1',
          tenantId: 'tenant-1',
          agentId: 'agent-1',
          leadId: 'lead-1',
          phoneNumber: '+15555555555',
        }),
      ).rejects.toThrow(InternalServerErrorException);
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

    const resolved = registry.resolve();
    expect(resolved).toBe(mockAdapter);
    expect(resolved).toBeInstanceOf(MockTelephonyAdapter);
  });

  it('TELEPHONY_PROVIDER=twilio resolves TwilioAdapter', () => {
    setTwilioEnv();
    process.env.TELEPHONY_PROVIDER = 'twilio';
    const registry = new ProviderRegistryImpl();
    const twilioAdapter = new TwilioAdapter();
    registry.register('twilio', twilioAdapter);

    const resolved = registry.resolve();
    expect(resolved).toBe(twilioAdapter);
    expect(resolved).toBeInstanceOf(TwilioAdapter);
  });

  it('does not silently fall back from twilio to mock', () => {
    setTwilioEnv();
    process.env.TELEPHONY_PROVIDER = 'twilio';
    const registry = new ProviderRegistryImpl();
    const mockAdapter = new MockTelephonyAdapter();
    // Only register mock, NOT twilio
    registry.register('mock', mockAdapter);

    expect(() => registry.resolve()).toThrow(/no adapter was registered for it/);
  });

  it('both adapters can be registered and correct one is resolved', () => {
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
});

describe('TwilioAdapter resolved adapter interface compliance', () => {
  afterEach(() => {
    clearTwilioEnv();
    delete process.env.TELEPHONY_PROVIDER;
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
    expect(resolved.capabilities).toBeDefined();
    expect(resolved.capabilities.manualDial).toBe(true);
    expect(resolved.capabilities.cancel).toBe(true);
  });
});

describe('Twilio status mapping (for future webhook use)', () => {
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
