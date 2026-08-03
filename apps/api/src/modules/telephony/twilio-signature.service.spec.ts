import * as crypto from 'crypto';

import { TwilioSignatureService } from './twilio-signature.service';

const TEST_AUTH_TOKEN = 'x'.repeat(32);
const TEST_URL = 'http://localhost:3001/webhooks/twilio/status';
const TEST_PARAMS: Record<string, string> = {
  CallSid: 'CA' + '1'.repeat(32),
  CallStatus: 'completed',
  CallDuration: '30',
  From: '+15555555555',
  To: '+15551111111',
};

function makeValidSignature(token: string, url: string, params: Record<string, string>): string {
  // Twilio signature = HMAC-SHA1(authToken, url + sorted params)
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }
  return crypto.createHmac('sha1', token).update(data).digest('base64');
}

describe('TwilioSignatureService', () => {
  let service: TwilioSignatureService;

  beforeEach(() => {
    service = new TwilioSignatureService();
  });

  describe('validateRequest', () => {
    it('returns true when webhookVerify is false (dev/test mode)', () => {
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: false },
        'invalid-signature',
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(true);
    });

    it('returns true when webhookVerify is false even without signature', () => {
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: false },
        undefined,
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(true);
    });

    it('returns true for a valid signature', () => {
      const validSignature = makeValidSignature(TEST_AUTH_TOKEN, TEST_URL, TEST_PARAMS);
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        validSignature,
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(true);
    });

    it('returns false for an invalid signature', () => {
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        'invalid-signature-value',
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(false);
    });

    it('returns false when signature is missing', () => {
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        undefined,
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(false);
    });

    it('returns false when signature is empty string', () => {
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        '',
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(false);
    });

    it('returns false when URL does not match the signed URL', () => {
      const validSignature = makeValidSignature(TEST_AUTH_TOKEN, TEST_URL, TEST_PARAMS);
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        validSignature,
        'http://evil.com/webhooks/twilio/status',
        TEST_PARAMS,
      );
      expect(result).toBe(false);
    });

    it('returns false when params have been tampered with', () => {
      const validSignature = makeValidSignature(TEST_AUTH_TOKEN, TEST_URL, TEST_PARAMS);
      const tamperedParams = { ...TEST_PARAMS, CallStatus: 'failed' };
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        validSignature,
        TEST_URL,
        tamperedParams,
      );
      expect(result).toBe(false);
    });

    it('returns false when auth token is wrong', () => {
      const validSignature = makeValidSignature(TEST_AUTH_TOKEN, TEST_URL, TEST_PARAMS);
      const result = service.validateRequest(
        { authToken: 'y'.repeat(32), webhookVerify: true },
        validSignature,
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(false);
    });

    it('returns true for valid signature with empty params', () => {
      const emptyParams: Record<string, string> = {};
      const validSignature = makeValidSignature(TEST_AUTH_TOKEN, TEST_URL, emptyParams);
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        validSignature,
        TEST_URL,
        emptyParams,
      );
      expect(result).toBe(true);
    });
  });

  describe('security', () => {
    it('never throws — returns false for bad input instead of crashing', () => {
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        undefined,
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(false);
    });

    it('does not expose auth token in any error or return value', () => {
      const result = service.validateRequest(
        { authToken: TEST_AUTH_TOKEN, webhookVerify: true },
        'bad',
        TEST_URL,
        TEST_PARAMS,
      );
      expect(result).toBe(false);
      expect(JSON.stringify(result)).not.toContain(TEST_AUTH_TOKEN);
    });
  });
});
