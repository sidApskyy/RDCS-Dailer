import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Observable } from 'rxjs';

import { TelephonyAdapter } from './telephony.adapter';
import { CallCapabilities, CallCommand, CallEvent, CallResult } from './telephony.types';
import { TwilioConfig, TWILIO_ENV_KEYS } from './twilio.types';

/**
 * TwilioAdapter — Stub implementation for Phase 5.2.1.
 *
 * This adapter implements the TelephonyAdapter interface but does NOT
 * make real Twilio API calls. All methods throw InternalServerErrorException
 * to ensure the stub is never accidentally used in production.
 *
 * Configuration is validated lazily — only when a method is actually called.
 * This allows NestJS to instantiate the adapter without error even when
 * TELEPHONY_PROVIDER=mock and Twilio env vars are absent.
 *
 * When TELEPHONY_PROVIDER=twilio and required env vars are missing,
 * the first method call throws a clear InternalServerErrorException listing
 * the missing variables (fail-fast principle).
 *
 * Phase 5.2.2 will replace the stub method bodies with real Twilio SDK calls.
 */
@Injectable()
export class TwilioAdapter implements TelephonyAdapter {
  readonly capabilities: CallCapabilities = {
    manualDial: true,
    cancel: true,
    hold: false,
    recording: false,
    transfer: false,
  };

  private cachedConfig: TwilioConfig | null = null;

  /**
   * Lazily loads and validates Twilio configuration from environment variables.
   * Throws InternalServerErrorException if required variables are missing or invalid.
   * Credentials are never included in error messages.
   * Cached after first successful call.
   */
  private ensureConfig(): TwilioConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }
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
      throw new InternalServerErrorException(
        `${TWILIO_ENV_KEYS.ACCOUNT_SID} must start with "AC".`,
      );
    }

    if (authToken.length < 32) {
      throw new InternalServerErrorException(
        `${TWILIO_ENV_KEYS.AUTH_TOKEN} must be at least 32 characters long.`,
      );
    }

    const config = { accountSid, authToken, phoneNumber, webhookUrl, webhookVerify };
    this.cachedConfig = config;
    return config;
  }

  /**
   * Stub — validates config then throws InternalServerErrorException.
   * Phase 5.2.2 will implement real Twilio Voice API call creation.
   */
  async dial(_command: CallCommand): Promise<CallResult> {
    this.ensureConfig();
    throw new InternalServerErrorException(
      'TwilioAdapter.dial() is not implemented. Phase 5.2.1 provides a stub only. ' +
        'Set TELEPHONY_PROVIDER=mock for functional calling, or wait for Phase 5.2.2.',
    );
  }

  /**
   * Stub — validates config then throws InternalServerErrorException.
   * Phase 5.2.2 will implement real Twilio call cancellation.
   */
  async cancel(_callId: string): Promise<void> {
    this.ensureConfig();
    throw new InternalServerErrorException(
      'TwilioAdapter.cancel() is not implemented. Phase 5.2.1 provides a stub only. ' +
        'Set TELEPHONY_PROVIDER=mock for functional calling, or wait for Phase 5.2.2.',
    );
  }

  /**
   * Stub — validates config then throws InternalServerErrorException.
   * Phase 5.2.2 will implement real event bridging via Twilio webhooks.
   */
  events(_callId: string): Observable<CallEvent> {
    this.ensureConfig();
    throw new InternalServerErrorException(
      'TwilioAdapter.events() is not implemented. Phase 5.2.1 provides a stub only. ' +
        'Set TELEPHONY_PROVIDER=mock for functional calling, or wait for Phase 5.2.2.',
    );
  }

  /**
   * Exposes the validated configuration for testing purposes.
   * Triggers lazy validation if not yet loaded.
   * Credentials are never logged or exposed to the frontend.
   */
  getConfig(): Readonly<TwilioConfig> {
    return { ...this.ensureConfig() };
  }
}
