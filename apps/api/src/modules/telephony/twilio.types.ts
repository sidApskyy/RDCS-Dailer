/**
 * Twilio-specific configuration and type definitions.
 *
 * Phase 5.2.2 — Real Twilio outbound call implementation.
 * These types define the configuration structure, status mapping,
 * call info, and error mapping used by the TwilioAdapter and TwilioClient.
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

/**
 * Normalized Twilio call information returned by TwilioClient.
 * Contains only the fields needed by the adapter — no credentials.
 */
export interface TwilioCallInfo {
  sid: string;
  status: string;
  duration: string | null;
  from: string;
  to: string;
}

/**
 * Mapping from Twilio failure statuses to safe, non-sensitive error codes
 * used in CallFailure.code. These codes are safe to expose in errors and logs.
 */
export const TWILIO_ERROR_MAP: Record<string, { code: string; message: string; retryable: boolean }> = {
  busy: { code: 'TWILIO_BUSY', message: 'Destination line busy', retryable: true },
  failed: { code: 'TWILIO_FAILED', message: 'Twilio call failed', retryable: false },
  no_answer: { code: 'TWILIO_NO_ANSWER', message: 'No answer at destination', retryable: true },
  cancelled: { code: 'TWILIO_CANCELLED', message: 'Call was cancelled', retryable: false },
};

/**
 * Polling configuration for Twilio call status checks.
 */
export const TWILIO_POLL_INTERVAL_MS = 2000;
export const TWILIO_POLL_MAX_DURATION_MS = 300_000;

/**
 * Twilio call statuses that indicate a terminal state — polling stops.
 */
export const TWILIO_TERMINAL_STATUSES = new Set([
  'completed',
  'busy',
  'failed',
  'no-answer',
  'canceled',
]);

/**
 * Phase 5.2.3 — Twilio webhook payload types.
 *
 * Twilio sends status callbacks as URL-encoded form data.
 * These types represent the normalized payload after parsing.
 */

/**
 * Normalized Twilio status callback payload.
 * Contains only the fields needed for call state processing.
 */
export interface TwilioStatusCallbackPayload {
  /** Twilio Call SID (starts with "CA") */
  callSid: string;
  /** Twilio call status string (queued, initiated, ringing, in-progress, completed, busy, failed, no-answer, canceled) */
  callStatus: string;
  /** Call duration in seconds (only present on completed status) */
  callDuration?: string;
  /** Caller phone number */
  from?: string;
  /** Destination phone number */
  to?: string;
  /** Call direction (outbound-api, inbound, etc.) */
  direction?: string;
}

/**
 * HTTP header name for the Twilio webhook signature.
 */
export const TWILIO_SIGNATURE_HEADER = 'x-twilio-signature';
