import { BadRequestException, NotFoundException } from '@nestjs/common';

import { LeadService } from './lead.service';

function createPrismaMock(lead: any) {
  return {
    lead: {
      findFirst: jest.fn().mockResolvedValue(lead),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'lead-1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'lead-1', ...lead, ...data })),
    },
    audit: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as any;
}

describe('LeadService state machine', () => {
  const baseLead = {
    id: 'lead-1',
    tenantId: 'tenant-1',
    externalId: 'ext-1',
    status: 'new',
    createdBy: 'user-1',
  };

  it('allows a valid transition new -> eligible', async () => {
    const prisma = createPrismaMock({ ...baseLead, status: 'new' });
    const service = new LeadService(prisma);

    const result = await service.transitionStatus('tenant-1', 'lead-1', { status: 'eligible' }, 'user-1');

    expect(result.status).toBe('eligible');
    expect(prisma.lead.update).toHaveBeenCalled();
    expect(prisma.audit.create).toHaveBeenCalled();
  });

  it('allows in_progress -> converted', async () => {
    const prisma = createPrismaMock({ ...baseLead, status: 'in_progress' });
    const service = new LeadService(prisma);

    const result = await service.transitionStatus('tenant-1', 'lead-1', { status: 'converted' }, 'user-1');
    expect(result.status).toBe('converted');
  });

  it('rejects an invalid transition new -> converted', async () => {
    const prisma = createPrismaMock({ ...baseLead, status: 'new' });
    const service = new LeadService(prisma);

    await expect(
      service.transitionStatus('tenant-1', 'lead-1', { status: 'converted' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('rejects any transition out of a terminal archived state', async () => {
    const prisma = createPrismaMock({ ...baseLead, status: 'archived' });
    const service = new LeadService(prisma);

    await expect(
      service.transitionStatus('tenant-1', 'lead-1', { status: 'eligible' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFound when the lead does not exist', async () => {
    const prisma = createPrismaMock(null);
    const service = new LeadService(prisma);

    await expect(
      service.transitionStatus('tenant-1', 'missing', { status: 'eligible' }, 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks deletion of a lead that is in progress', async () => {
    const prisma = createPrismaMock({ ...baseLead, status: 'in_progress' });
    const service = new LeadService(prisma);

    await expect(service.delete('tenant-1', 'lead-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
