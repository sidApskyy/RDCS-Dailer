import { Server as HttpServer } from 'node:http';

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';

import { LoggerService } from '../../common/logger/logger.service';
import { AuthService } from '../auth/auth.service';

import { TelephonyEvents } from './telephony.events';

@Injectable()
export class TelephonySocketService implements OnModuleDestroy {
  private server?: Server;
  private removeListener?: () => void;

  constructor(private readonly auth: AuthService, private readonly events: TelephonyEvents, private readonly logger: LoggerService) {}

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
        this.logger.debug('Socket authenticated', 'TelephonySocketService', { tenantId: payload.tenantId, userId: payload.userId, socketId: socket.id });
        next();
      } catch (error) {
        this.logger.warn('Socket authentication failed', 'TelephonySocketService', { socketId: socket.id, reason: error instanceof Error ? error.message : 'unknown' });
        next(new Error('Unauthorized'));
      }
    });
    this.removeListener = this.events.on((event) => {
      this.server?.to(`tenant:${event.tenantId}`).emit(event.type, event);
      if (event.agentId) this.server?.to(`agent:${event.agentId}`).emit(event.type, event);
    });
  }

  onModuleDestroy(): void {
    this.logger.log('Socket server shutting down', 'TelephonySocketService');
    this.removeListener?.();
    this.server?.close();
  }
}
