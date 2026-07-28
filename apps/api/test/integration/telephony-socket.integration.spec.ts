import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';

import { TelephonyEvents } from '../../src/modules/telephony/telephony.events';
import { CallState } from '../../src/modules/telephony/telephony.types';
import { createTestApp, closeTestApp } from '../helpers/telephony-test-helper';
import { testDb, testAuth } from '../setup';

describe('Phase 4 — Socket.IO Integration Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let events: TelephonyEvents;
  let httpServer: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    ({ app, module } = await createTestApp());
    httpServer = app.getHttpServer();
    events = module.get(TelephonyEvents);
  });

  afterAll(async () => {
    await closeTestApp(app, module);
  });

  beforeEach(async () => {
    await testDb.clean();
  });

  function waitForListen(server: ReturnType<INestApplication['getHttpServer']>): Promise<string> {
    return new Promise((resolve) => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        resolve(`http://localhost:${addr.port}`);
      } else {
        server.listen(() => {
          const a = server.address();
          resolve(`http://localhost:${a && typeof a === 'object' ? a.port : 3001}`);
        });
      }
    });
  }

  async function createClient(token?: string): Promise<Socket> {
    const baseUrl = await waitForListen(httpServer);
    return io(baseUrl, {
      path: '/socket.io',
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      forceNew: true,
    });
  }

  function disconnect(client: Socket): Promise<void> {
    return new Promise((resolve) => {
      if (client.connected) client.disconnect();
      resolve();
    });
  }

  async function seedUser(userId: string, tenantId: string): Promise<string> {
    const passwordHash = await testAuth.hashPassword('TestPassword123!');
    await testDb.seedTenant({ id: tenantId, name: tenantId, slug: tenantId });
    await testDb.seedUser({ id: userId, tenantId, email: `${userId}@example.com`, passwordHash, status: 'active' });
    return testAuth.generateAccessToken({ id: userId, tenantId, email: `${userId}@example.com`, password: 'TestPassword123!', roles: ['agent'] });
  }

  it('should reject connection without token', async () => {
    const client = await createClient();
    await new Promise<void>((resolve) => {
      client.on('connect_error', (err: Error) => {
        expect(err.message).toBe('Unauthorized');
        resolve();
      });
    });
    await disconnect(client);
  });

  it('should reject connection with invalid token', async () => {
    const client = await createClient('invalid-token');
    await new Promise<void>((resolve) => {
      client.on('connect_error', (err: Error) => {
        expect(err.message).toBe('Unauthorized');
        resolve();
      });
    });
    await disconnect(client);
  });

  it('should accept connection with valid token', async () => {
    const token = await seedUser('user-socket-1', 'tenant-1');
    const client = await createClient(token);
    await new Promise<void>((resolve) => {
      client.on('connect', () => resolve());
    });
    expect(client.connected).toBe(true);
    await disconnect(client);
  });

  it('should receive call events on tenant room', async () => {
    const token = await seedUser('user-socket-2', 'tenant-1');
    const client = await createClient(token);
    await new Promise<void>((resolve) => { client.on('connect', () => resolve()); });

    const receivedEvent = new Promise<any>((resolve) => {
      client.on('call.created', (event: any) => resolve(event));
    });

    events.emit({
      type: 'call.created',
      callId: 'test-call-1',
      tenantId: 'tenant-1',
      agentId: 'user-socket-2',
      state: CallState.Queued,
      occurredAt: new Date(),
    });

    const event = await receivedEvent;
    expect(event.callId).toBe('test-call-1');
    expect(event.tenantId).toBe('tenant-1');
    await disconnect(client);
  });

  it('should not receive events from other tenant room', async () => {
    const tokenA = await seedUser('user-socket-a', 'tenant-a');
    const tokenB = await seedUser('user-socket-b', 'tenant-b');
    const clientA = await createClient(tokenA);
    const clientB = await createClient(tokenB);
    await new Promise<void>((resolve) => { clientA.on('connect', () => resolve()); });
    await new Promise<void>((resolve) => { clientB.on('connect', () => resolve()); });

    let receivedByA = false;
    clientA.on('call.created', () => { receivedByA = true; });

    events.emit({
      type: 'call.created',
      callId: 'test-call-b',
      tenantId: 'tenant-b',
      agentId: 'user-socket-b',
      state: CallState.Queued,
      occurredAt: new Date(),
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(receivedByA).toBe(false);

    await disconnect(clientA);
    await disconnect(clientB);
  });

  it('should receive events on agent-specific room', async () => {
    const token = await seedUser('user-socket-3', 'tenant-1');
    const client = await createClient(token);
    await new Promise<void>((resolve) => { client.on('connect', () => resolve()); });

    const received = new Promise<any>((resolve) => {
      client.on('call.connected', (event: any) => resolve(event));
    });

    events.emit({
      type: 'call.connected',
      callId: 'test-call-2',
      tenantId: 'tenant-1',
      agentId: 'user-socket-3',
      state: CallState.Connected,
      occurredAt: new Date(),
    });

    const event = await received;
    expect(event.agentId).toBe('user-socket-3');
    await disconnect(client);
  });

  it('should handle disconnect and reconnect', async () => {
    const token = await seedUser('user-socket-4', 'tenant-1');
    const client = await createClient(token);
    await new Promise<void>((resolve) => { client.on('connect', () => resolve()); });
    expect(client.connected).toBe(true);

    client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(client.connected).toBe(false);

    await client.connect();
    await new Promise<void>((resolve) => { client.on('connect', () => resolve()); });
    expect(client.connected).toBe(true);

    await disconnect(client);
  });
});
