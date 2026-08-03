jest.mock('twilio', () => {
  const mockCallContext = {
    fetch: jest.fn(),
    update: jest.fn(),
  };
  const mockCallsList = {
    create: jest.fn(),
  };
  const mockTwilio = jest.fn().mockImplementation(() => ({
    calls: Object.assign(jest.fn().mockReturnValue(mockCallContext), mockCallsList),
  }));
  (mockTwilio as any).__mockCallContext = mockCallContext;
  (mockTwilio as any).__mockCallsList = mockCallsList;
  return mockTwilio;
});

import Twilio from 'twilio';

import { TwilioClient } from './twilio.client';

const FAKE_ACCOUNT_SID = 'AC' + 'a'.repeat(30);
const FAKE_AUTH_TOKEN = 'x'.repeat(32);

function createMockCallInstance(overrides: Partial<{ sid: string; status: string; duration: string; from: string; to: string }> = {}) {
  return {
    sid: overrides.sid || 'CA' + '1'.repeat(32),
    status: overrides.status || 'queued',
    duration: overrides.duration || '',
    from: overrides.from || '+15550000000',
    to: overrides.to || '+15551111111',
  } as unknown as { sid: string; status: string; duration: string; from: string; to: string };
}

interface MockFn {
  mockResolvedValue: (value: unknown) => MockFn;
  mockRejectedValue: (value: unknown) => MockFn;
  mockReturnValue: (value: unknown) => MockFn;
  mockClear: () => void;
  toHaveBeenCalledWith: (...args: unknown[]) => boolean;
  toHaveBeenCalled: () => boolean;
}

const mockTwilio = Twilio as unknown as { (sid: string, token: string): unknown; __mockCallContext: Record<string, MockFn>; __mockCallsList: Record<string, MockFn> };
const mockCallContext = mockTwilio.__mockCallContext;
const mockCallsList = mockTwilio.__mockCallsList;

describe('TwilioClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallsList.create.mockResolvedValue(createMockCallInstance());
    mockCallContext.fetch.mockResolvedValue(createMockCallInstance());
    mockCallContext.update.mockResolvedValue(createMockCallInstance());
  });

  describe('constructor', () => {
    it('should create a Twilio client with provided credentials', () => {
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      expect(client).toBeDefined();
      expect(mockTwilio).toHaveBeenCalledWith(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
    });

    it('should pass credentials to the SDK constructor', () => {
      new TwilioClient('AC' + 'b'.repeat(30), 'y'.repeat(32));
      expect(mockTwilio).toHaveBeenCalledWith('AC' + 'b'.repeat(30), 'y'.repeat(32));
    });
  });

  describe('createCall', () => {
    it('should call SDK calls.create with correct parameters', async () => {
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      await client.createCall({
        to: '+15551111111',
        from: '+15550000000',
        twiml: '<Response><Dial>+15551111111</Dial></Response>',
      });
      expect(mockCallsList.create).toHaveBeenCalledWith({
        to: '+15551111111',
        from: '+15550000000',
        twiml: '<Response><Dial>+15551111111</Dial></Response>',
      });
    });

    it('should return normalized TwilioCallInfo with sid, status, from, to', async () => {
      mockCallsList.create.mockResolvedValue(createMockCallInstance({
        sid: 'CA' + '9'.repeat(32),
        status: 'queued',
        from: '+15550000000',
        to: '+15551111111',
      }));
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      const result = await client.createCall({ to: '+15551111111', from: '+15550000000', twiml: '<Response/>' });
      expect(result.sid).toBe('CA' + '9'.repeat(32));
      expect(result.status).toBe('queued');
      expect(result.from).toBe('+15550000000');
      expect(result.to).toBe('+15551111111');
    });

    it('should normalize empty duration to null', async () => {
      mockCallsList.create.mockResolvedValue(createMockCallInstance({ duration: '' }));
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      const result = await client.createCall({ to: '+15551111111', from: '+15550000000', twiml: '<Response/>' });
      expect(result.duration).toBeNull();
    });

    it('should preserve non-empty duration', async () => {
      mockCallsList.create.mockResolvedValue(createMockCallInstance({ duration: '42' }));
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      const result = await client.createCall({ to: '+15551111111', from: '+15550000000', twiml: '<Response/>' });
      expect(result.duration).toBe('42');
    });

    it('should propagate SDK errors', async () => {
      mockCallsList.create.mockRejectedValue(new Error('Twilio API error'));
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      await expect(client.createCall({ to: '+15551111111', from: '+15550000000', twiml: '<Response/>' }))
        .rejects.toThrow('Twilio API error');
    });
  });

  describe('fetchCall', () => {
    it('should call SDK calls(sid).fetch', async () => {
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      await client.fetchCall('CA' + '1'.repeat(32));
      expect(mockCallContext.fetch).toHaveBeenCalled();
    });

    it('should return normalized TwilioCallInfo', async () => {
      mockCallContext.fetch.mockResolvedValue(createMockCallInstance({
        sid: 'CA' + '2'.repeat(32),
        status: 'in-progress',
        duration: '10',
      }));
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      const result = await client.fetchCall('CA' + '2'.repeat(32));
      expect(result.sid).toBe('CA' + '2'.repeat(32));
      expect(result.status).toBe('in-progress');
      expect(result.duration).toBe('10');
    });

    it('should propagate SDK errors', async () => {
      mockCallContext.fetch.mockRejectedValue(new Error('Not found'));
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      await expect(client.fetchCall('CA123')).rejects.toThrow('Not found');
    });
  });

  describe('cancelCall', () => {
    it('should call SDK calls(sid).update with status canceled', async () => {
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      await client.cancelCall('CA' + '3'.repeat(32));
      expect(mockCallContext.update).toHaveBeenCalledWith({ status: 'canceled' });
    });

    it('should propagate SDK errors', async () => {
      mockCallContext.update.mockRejectedValue(new Error('Cancel failed'));
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      await expect(client.cancelCall('CA123')).rejects.toThrow('Cancel failed');
    });
  });

  describe('credential security', () => {
    it('should not expose credentials in returned TwilioCallInfo', async () => {
      mockCallsList.create.mockResolvedValue(createMockCallInstance());
      const client = new TwilioClient(FAKE_ACCOUNT_SID, FAKE_AUTH_TOKEN);
      const result = await client.createCall({ to: '+15551111111', from: '+15550000000', twiml: '<Response/>' });
      expect(JSON.stringify(result)).not.toContain(FAKE_ACCOUNT_SID);
      expect(JSON.stringify(result)).not.toContain(FAKE_AUTH_TOKEN);
    });
  });
});
