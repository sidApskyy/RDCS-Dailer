import { createServer } from 'http';

import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import { Server, Socket } from 'socket.io';

import { validateEnv } from './env.validation';
import { logger } from './logger';

// Validate environment variables
validateEnv();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.WEB_ORIGIN || '*' },
});

const pubClient = new IORedis(process.env.REDIS_URL || 'redis://:rdcs@localhost:6379/0');
const subClient = pubClient.duplicate();

pubClient.on('ready', () => logger.info('RDCS socket Redis publisher ready'));
subClient.on('ready', () => logger.info('RDCS socket Redis subscriber ready'));
pubClient.on('error', (error) => logger.error('RDCS socket Redis publisher error', error.message));
subClient.on('error', (error) =>
  logger.error('RDCS socket Redis subscriber error', error.message),
);

io.adapter(createAdapter(pubClient, subClient));

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    tenantId: string;
  };
}

io.use(async (socket: AuthenticatedSocket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return next(new Error('Invalid or expired token'));
    }

    const payload = await response.json() as { userId: string; tenantId: string };
    socket.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
    };

    socket.join(`tenant:${payload.tenantId}`);
    next();
  } catch (error) {
    logger.error('Socket authentication error', error);
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket: AuthenticatedSocket) => {
  logger.info('socket connected', { socketId: socket.id, userId: socket.user?.userId, tenantId: socket.user?.tenantId });

  socket.on('disconnect', () => {
    logger.info('socket disconnected', { socketId: socket.id, userId: socket.user?.userId });
  });

  socket.on('error', (error) => {
    logger.error('socket error', { socketId: socket.id, error: error.message });
  });
});

const port = process.env.SOCKET_PORT || 3002;
httpServer.listen(port, () => {
  logger.info(`RDCS socket gateway running on http://localhost:${port}`);
});

const shutdown = async () => {
  io.close();
  await Promise.all([pubClient.quit(), subClient.quit()]);
  logger.info('RDCS socket gateway shutdown complete');
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
