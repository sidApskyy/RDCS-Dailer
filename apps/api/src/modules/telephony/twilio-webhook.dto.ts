import { TwilioStatusCallbackPayload } from './twilio.types';

/**
 * Phase 5.2.3 — Parses raw Twilio webhook form data into a normalized payload.
 *
 * Twilio sends status callbacks as `application/x-www-form-urlencoded` data.
 * This function extracts only the fields needed for call state processing
 * and normalizes field names from PascalCase to camelCase.
 *
 * Does not throw on missing optional fields — only requires CallSid and CallStatus.
 */
export function parseStatusCallback(body: Record<string, string>): TwilioStatusCallbackPayload {
  const callSid = body['CallSid'];
  const callStatus = body['CallStatus'];

  if (!callSid || !callStatus) {
    throw new Error('Missing required Twilio webhook fields: CallSid or CallStatus');
  }

  return {
    callSid,
    callStatus,
    callDuration: body['CallDuration'] || undefined,
    from: body['From'] || undefined,
    to: body['To'] || undefined,
    direction: body['Direction'] || undefined,
  };
}
