/**
 * Twilio-specific configuration and type definitions.
 *
 * Phase 5.2.1 — Stub only. No real Twilio SDK integration yet.
 * These types define the configuration structure and status mapping
 * that will be used when the full adapter is implemented in Phase 5.2.2.
 */

export interface TwilioConfig {
  /** Twilio Account SID (starts with "AC") */
  accountSid: string;
  /** Twilio Auth Token */
  authToken: string;
  /** Default outbound phone number in E.164 format */
  phoneNumber: string;
  /** Public URL for Twilio status callback webhooks */
  webhookUrl: string;
  /** Whether to verify Twilio webhook signatures (default: true) */
  webhookVerify: boolean;
}

/**
 * Mapping from Twilio call status strings to internal CallState values.
 * Used by the webhook controller (Phase 5.2.3) and adapter event bridge.
 */
export const TWILIO_STATUS_MAP: Record<string, string> = {
  queued: 'queued',
  initiated: 'dialing',
  ringing: 'ringing',
  'in-progress': 'connected',
  completed: 'completed',
  busy: 'busy',
  failed: 'failed',
  'no-answer': 'no_answer',
  canceled: 'cancelled',
};

/**
 * Environment variable names for Twilio configuration.
 */
export const TWILIO_ENV_KEYS = {
  ACCOUNT_SID: 'TWILIO_ACCOUNT_SID',
  AUTH_TOKEN: 'TWILIO_AUTH_TOKEN',
  PHONE_NUMBER: 'TWILIO_PHONE_NUMBER',
  WEBHOOK_URL: 'TWILIO_WEBHOOK_URL',
  WEBHOOK_VERIFY: 'TWILIO_WEBHOOK_VERIFY',
} as const;
