import Twilio from 'twilio';

import { TwilioCallInfo } from './twilio.types';

export class TwilioClient {
  private readonly client: Twilio.Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = Twilio(accountSid, authToken);
  }

  async createCall(params: { to: string; from: string; twiml: string; statusCallback?: string; statusCallbackEvent?: string[] }): Promise<TwilioCallInfo> {
    const createData: Record<string, unknown> = {
      to: params.to,
      from: params.from,
      twiml: params.twiml,
    };
    if (params.statusCallback) {
      createData.statusCallback = params.statusCallback;
      createData.statusCallbackEvent = params.statusCallbackEvent || ['initiated', 'ringing', 'answered', 'completed'];
    }
    const call = await this.client.calls.create(createData as unknown as Parameters<typeof this.client.calls.create>[0]);
    return this.normalizeCall(call);
  }

  async fetchCall(sid: string): Promise<TwilioCallInfo> {
    const call = await this.client.calls(sid).fetch();
    return this.normalizeCall(call);
  }

  async cancelCall(sid: string): Promise<void> {
    await this.client.calls(sid).update({ status: 'canceled' });
  }

  private normalizeCall(call: { sid: string; status: string; duration: string; from: string; to: string }): TwilioCallInfo {
    return {
      sid: call.sid,
      status: call.status,
      duration: call.duration || null,
      from: call.from,
      to: call.to,
    };
  }
}
