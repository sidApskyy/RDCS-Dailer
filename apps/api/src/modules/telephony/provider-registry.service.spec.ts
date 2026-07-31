import { MockTelephonyAdapter } from './mock-telephony.adapter';
import { ProviderRegistryImpl, UnsupportedProviderError, DEFAULT_PROVIDER, SUPPORTED_PROVIDERS } from './provider-registry.service';
import { TelephonyAdapter } from './telephony.adapter';

describe('ProviderRegistry', () => {
  afterEach(() => {
    delete process.env.TELEPHONY_PROVIDER;
  });

  describe('default provider resolution', () => {
    it('resolves MockTelephonyAdapter when TELEPHONY_PROVIDER is missing', () => {
      delete process.env.TELEPHONY_PROVIDER;
      const registry = new ProviderRegistryImpl();
      const mockAdapter = new MockTelephonyAdapter();
      registry.register('mock', mockAdapter);

      const resolved = registry.resolve();
      expect(resolved).toBe(mockAdapter);
      expect(registry.getProviderKey()).toBe(DEFAULT_PROVIDER);
    });

    it('resolves MockTelephonyAdapter when TELEPHONY_PROVIDER is empty', () => {
      process.env.TELEPHONY_PROVIDER = '';
      const registry = new ProviderRegistryImpl();
      const mockAdapter = new MockTelephonyAdapter();
      registry.register('mock', mockAdapter);

      const resolved = registry.resolve();
      expect(resolved).toBe(mockAdapter);
    });
  });

  describe('explicit mock provider', () => {
    it('resolves MockTelephonyAdapter when TELEPHONY_PROVIDER=mock', () => {
      process.env.TELEPHONY_PROVIDER = 'mock';
      const registry = new ProviderRegistryImpl();
      const mockAdapter = new MockTelephonyAdapter();
      registry.register('mock', mockAdapter);

      const resolved = registry.resolve();
      expect(resolved).toBe(mockAdapter);
      expect(registry.getProviderKey()).toBe('mock');
    });

    it('is case-insensitive for provider key', () => {
      process.env.TELEPHONY_PROVIDER = 'MOCK';
      const registry = new ProviderRegistryImpl();
      expect(registry.getProviderKey()).toBe('mock');
    });
  });

  describe('unsupported provider', () => {
    it('throws UnsupportedProviderError for an unknown provider', () => {
      process.env.TELEPHONY_PROVIDER = 'invalid-provider';
      expect(() => new ProviderRegistryImpl()).toThrow(UnsupportedProviderError);
    });

    it('does not silently fall back to mock for unsupported provider', () => {
      process.env.TELEPHONY_PROVIDER = 'twilio';
      const registry = new ProviderRegistryImpl();
      const mockAdapter = new MockTelephonyAdapter();
      registry.register('mock', mockAdapter);

      expect(() => registry.resolve()).toThrow(
        /no adapter was registered for it/,
      );
    });

    it('error message includes supported providers', () => {
      process.env.TELEPHONY_PROVIDER = 'foo';
      try {
        new ProviderRegistryImpl();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnsupportedProviderError);
        const message = (error as UnsupportedProviderError).message;
        expect(message).toContain('mock');
        expect(message).toContain('twilio');
      }
    });
  });

  describe('adapter identity', () => {
    it('resolved adapter implements the TelephonyAdapter interface', () => {
      delete process.env.TELEPHONY_PROVIDER;
      const registry = new ProviderRegistryImpl();
      const mockAdapter = new MockTelephonyAdapter();
      registry.register('mock', mockAdapter);

      const resolved = registry.resolve();
      expect(resolved).toBeDefined();
      expect(typeof resolved.dial).toBe('function');
      expect(typeof resolved.cancel).toBe('function');
      expect(typeof resolved.events).toBe('function');
      expect(resolved.capabilities).toBeDefined();
      expect(resolved.capabilities.manualDial).toBe(true);
    });
  });

  describe('register', () => {
    it('allows registering multiple adapters', () => {
      process.env.TELEPHONY_PROVIDER = 'mock';
      const registry = new ProviderRegistryImpl();
      const mockAdapter = new MockTelephonyAdapter();
      const fakeAdapter: TelephonyAdapter = {
        capabilities: { manualDial: true, cancel: true, hold: false, recording: false, transfer: false },
        dial: jest.fn(),
        cancel: jest.fn(),
        events: jest.fn(),
      };

      registry.register('mock', mockAdapter);
      registry.register('twilio', fakeAdapter);

      expect(registry.resolve()).toBe(mockAdapter);
      expect(registry.getProviderKey()).toBe('mock');
    });
  });

  describe('supported providers list', () => {
    it('includes mock and twilio', () => {
      expect(SUPPORTED_PROVIDERS).toContain('mock');
      expect(SUPPORTED_PROVIDERS).toContain('twilio');
    });
  });
});
