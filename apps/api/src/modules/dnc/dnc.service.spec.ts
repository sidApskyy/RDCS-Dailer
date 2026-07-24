import { NotFoundException } from '@nestjs/common';

import { DNCService } from './dnc.service';

describe('DNCService tenant isolation', () => {
  function createPrismaMock(list: any) {
    return {
      dNCList: {
        findFirst: jest.fn().mockResolvedValue(list),
        update: jest.fn().mockResolvedValue({ id: 'list-1', isActive: false }),
      },
      dNCEntry: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;
  }

  it('updateList throws NotFound for a cross-tenant list and does not write', async () => {
    const prisma = createPrismaMock(null);
    const service = new DNCService(prisma);

    await expect(service.updateList('tenant-1', 'other-tenant-list', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.dNCList.update).not.toHaveBeenCalled();
  });

  it('deleteList throws NotFound for a cross-tenant list and does not write', async () => {
    const prisma = createPrismaMock(null);
    const service = new DNCService(prisma);

    await expect(service.deleteList('tenant-1', 'other-tenant-list')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.dNCList.update).not.toHaveBeenCalled();
  });

  it('getEntries throws NotFound for a cross-tenant list', async () => {
    const prisma = createPrismaMock(null);
    const service = new DNCService(prisma);

    await expect(service.getEntries('tenant-1', 'other-tenant-list', {})).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.dNCEntry.findMany).not.toHaveBeenCalled();
  });

  it('updateList succeeds for an owned list', async () => {
    const prisma = createPrismaMock({ id: 'list-1', tenantId: 'tenant-1', name: 'Mine' });
    const service = new DNCService(prisma);

    await service.updateList('tenant-1', 'list-1', { name: 'Renamed' });
    expect(prisma.dNCList.update).toHaveBeenCalled();
  });
});
