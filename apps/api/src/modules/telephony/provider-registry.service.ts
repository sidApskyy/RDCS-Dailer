import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { TelephonyAdapter } from './telephony.adapter';

export type ProviderKey = 'mock' | 'twilio';

export const SUPPORTED_PROVIDERS: readonly ProviderKey[] = ['mock', 'twilio'];

export const DEFAULT_PROVIDER: ProviderKey = 'mock';

export const PROVIDER_REGISTRY = Symbol('PROVIDER_REGISTRY');

export interface ProviderRegistry {
  resolve(): TelephonyAdapter;
  register(key: ProviderKey, adapter: TelephonyAdapter): void;
  getProviderKey(): ProviderKey;
}

export class UnsupportedProviderError extends InternalServerErrorException {
  constructor(provider: string, supported: readonly string[]) {
    super(
      `Unsupported telephony provider "${provider}". Supported providers: ${supported.join(', ')}. ` +
        `Set TELEPHONY_PROVIDER to one of the supported values or remove it to use the default ("${DEFAULT_PROVIDER}").`,
    );
  }
}

@Injectable()
export class ProviderRegistryImpl implements ProviderRegistry {
  private readonly adapters = new Map<ProviderKey, TelephonyAdapter>();
  private readonly providerKey: ProviderKey;

  constructor() {
    const raw = (process.env.TELEPHONY_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
    if (!SUPPORTED_PROVIDERS.includes(raw as ProviderKey)) {
      throw new UnsupportedProviderError(raw, SUPPORTED_PROVIDERS);
    }
    this.providerKey = raw as ProviderKey;
  }

  register(key: ProviderKey, adapter: TelephonyAdapter): void {
    this.adapters.set(key, adapter);
  }

  resolve(): TelephonyAdapter {
    const adapter = this.adapters.get(this.providerKey);
    if (!adapter) {
      throw new InternalServerErrorException(
        `Telephony provider "${this.providerKey}" is configured but no adapter was registered for it. ` +
          `Ensure that the adapter for "${this.providerKey}" is properly registered in TelephonyModule.`,
      );
    }
    return adapter;
  }

  getProviderKey(): ProviderKey {
    return this.providerKey;
  }
}
