import { Server as HttpServer } from 'node:http';

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';

import { AuthService } from '../auth/auth.service';

import { TelephonyEvents } from './telephony.events';

@Injectable()
export class TelephonySocketService implements OnModuleDestroy {
  private server?: Server;
  private removeListener?: () => void;

  constructor(private readonly auth: AuthService, private readonly events: TelephonyEvents) {}

  attach(httpServer: HttpServer): void {
    const allowedOrigins = (process.env.WEB_ORIGINS || 'http://localhost:3000').split(',').map((origin) => origin.trim()).filter(Boolean);
    this.server = new Server(httpServer, { path: '/socket.io', cors: { origin: allowedOrigins, credentials: true } });
    this.server.use(async (socket, next) => {
      try {
        const token = String(socket.handshake.auth?.token || socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const payload = await this.auth.verifyToken(token);
        socket.data.tenantId = payload.tenantId;
        socket.data.userId = payload.userId;
        socket.join(`tenant:${payload.tenantId}`);
        socket.join(`agent:${payload.userId}`);
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
    this.removeListener = this.events.on((event) => {
      this.server?.to(`tenant:${event.tenantId}`).emit(event.type, event);
      if (event.agentId) this.server?.to(`agent:${event.agentId}`).emit(event.type, event);
    });
  }

  onModuleDestroy(): void {
    this.removeListener?.();
    this.server?.close();
  }
}
