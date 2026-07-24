import { NotFoundException } from '@nestjs/common';

import { DispositionService } from './disposition.service';

describe('DispositionService tenant isolation', () => {
  function createPrismaMock(disposition: any) {
    return {
      disposition: {
        findFirst: jest.fn().mockResolvedValue(disposition),
        update: jest.fn().mockResolvedValue({ id: 'disp-1' }),
      },
    } as any;
  }

  it('update throws NotFound for a cross-tenant disposition and does not write', async () => {
    const prisma = createPrismaMock(null);
    const service = new DispositionService(prisma);

    await expect(service.update('tenant-1', 'other-tenant-disp', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.disposition.update).not.toHaveBeenCalled();
  });

  it('update succeeds for an owned disposition', async () => {
    const prisma = createPrismaMock({ id: 'disp-1', tenantId: 'tenant-1', campaigns: [] });
    const service = new DispositionService(prisma);

    await service.update('tenant-1', 'disp-1', { name: 'Renamed' });
    expect(prisma.disposition.update).toHaveBeenCalled();
  });
});
