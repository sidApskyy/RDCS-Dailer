import { Injectable } from '@nestjs/common';
import Twilio from 'twilio';

import { TwilioConfig } from './twilio.types';

/**
 * Phase 5.2.3 — Twilio webhook signature verification service.
 *
 * Wraps the official Twilio SDK's `validateRequest` to verify
 * that incoming webhook requests are genuinely from Twilio.
 *
 * Security:
 * - The Auth Token is never logged or exposed in errors.
 * - When verification is disabled (TWILIO_WEBHOOK_VERIFY=false),
 *   all requests are accepted — for development/testing only.
 */
@Injectable()
export class TwilioSignatureService {
  /**
   * Validates a Twilio webhook request signature.
   *
   * @param config   Twilio configuration (contains authToken and webhookVerify flag)
   * @param signature The X-Twilio-Signature header value
   * @param url       The full public URL Twilio called (must match what Twilio has configured)
   * @param params    The parsed form body parameters
   * @returns true if the signature is valid or verification is disabled; false otherwise
   */
  validateRequest(
    config: Pick<TwilioConfig, 'authToken' | 'webhookVerify'>,
    signature: string | undefined,
    url: string,
    params: Record<string, string>,
  ): boolean {
    if (!config.webhookVerify) {
      return true;
    }

    if (!signature) {
      return false;
    }

    return Twilio.validateRequest(config.authToken, signature, url, params);
  }
}
