import { Observable } from 'rxjs';

import { CallCapabilities, CallCommand, CallEvent, CallResult } from './telephony.types';

export const TELEPHONY_ADAPTER = Symbol('TELEPHONY_ADAPTER');

export interface TelephonyAdapter {
  readonly capabilities: CallCapabilities;
  dial(command: CallCommand): Promise<CallResult>;
  cancel(callId: string): Promise<void>;
  events(callId: string): Observable<CallEvent>;
}
