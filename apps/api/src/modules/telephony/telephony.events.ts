import { EventEmitter } from 'node:events';

import { Injectable } from '@nestjs/common';

import { CallEvent } from './telephony.types';

@Injectable()
export class TelephonyEvents {
  private readonly emitter = new EventEmitter();

  emit(event: CallEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('call.event', event);
  }

  on(listener: (event: CallEvent) => void): () => void {
    this.emitter.on('call.event', listener);
    return () => this.emitter.off('call.event', listener);
  }
}
