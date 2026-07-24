import { NotFoundException } from '@nestjs/common';

import { CallingWindowService } from './calling-window.service';

describe('CallingWindowService tenant isolation', () => {
  const timezoneMock = { isValidTimezone: jest.fn().mockReturnValue(true) } as any;

  function createPrismaMock(window: any) {
    return {
      callingWindow: {
        findFirst: jest.fn().mockResolvedValue(window),
        update: jest.fn().mockResolvedValue({ id: 'win-1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
    } as any;
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
    const prisma = createPrismaMock({ id: 'win-1', tenantId: 'tenant-1' });
    const service = new CallingWindowService(prisma, timezoneMock);

    await service.delete('tenant-1', 'win-1');
    expect(prisma.callingWindow.delete).toHaveBeenCalled();
  });
});
