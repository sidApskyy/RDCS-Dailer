import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { TimezoneService } from '../compliance/timezone.service';

import { CallingWindowRecord, CallingWindowService } from './calling-window.service';

describe('CallingWindowService tenant isolation', () => {
  const timezoneMock = { isValidTimezone: jest.fn().mockReturnValue(true) } as unknown as TimezoneService;

  type CallingWindowDelegateMock = {
    findFirst: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  function createPrismaMock(window: CallingWindowRecord | null): PrismaService {
    const callingWindow: CallingWindowDelegateMock = {
      findFirst: jest.fn().mockResolvedValue(window),
      update: jest.fn().mockResolvedValue({ id: 'win-1' }),
      delete: jest.fn().mockResolvedValue({}),
    };
    return { callingWindow } as unknown as PrismaService;
  }

  it('update throws NotFound for a cross-tenant window and does not write', async () => {
    const prisma = createPrismaMock(null);
    const service = new CallingWindowService(prisma, timezoneMock);

    await expect(service.update('tenant-1', 'other-window', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.callingWindow.update).not.toHaveBeenCalled();
  });

  it('delete throws NotFound for a cross-tenant window and does not write', async () => {
    const prisma = createPrismaMock(null);
    const service = new CallingWindowService(prisma, timezoneMock);

    await expect(service.delete('tenant-1', 'other-window')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.callingWindow.delete).not.toHaveBeenCalled();
  });

  it('delete succeeds for an owned window', async () => {
    const prisma = createPrismaMock({
      id: 'win-1', tenantId: 'tenant-1', name: 'Window', description: null, dayOfWeek: -1,
      startTime: '09:00', endTime: '17:00', timezone: 'UTC', isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const service = new CallingWindowService(prisma, timezoneMock);

    await service.delete('tenant-1', 'win-1');
    expect(prisma.callingWindow.delete).toHaveBeenCalled();
  });
});
