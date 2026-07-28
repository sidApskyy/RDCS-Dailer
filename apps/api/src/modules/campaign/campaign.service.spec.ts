import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { CampaignService } from './campaign.service';

function createPrismaMock(campaign: Record<string, unknown>) {
  return {
    campaign: {
      findFirst: jest.fn().mockResolvedValue(campaign),
      update: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ ...campaign, ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
    audit: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

describe('CampaignService state machine', () => {
  const baseCampaign = {
    id: 'camp-1',
    tenantId: 'tenant-1',
    name: 'Test',
    slug: 'test',
    status: 'draft',
    createdBy: 'user-1',
  };

  it('allows draft -> active', async () => {
    const prisma = createPrismaMock({ ...baseCampaign, status: 'draft' });
    const service = new CampaignService(prisma);

    const result = await service.transitionStatus('tenant-1', 'camp-1', { status: 'active' }, 'user-1');
    expect(result.status).toBe('active');
    expect(prisma.audit.create).toHaveBeenCalled();
  });

  it('allows active -> paused', async () => {
    const prisma = createPrismaMock({ ...baseCampaign, status: 'active' });
    const service = new CampaignService(prisma);

    const result = await service.transitionStatus('tenant-1', 'camp-1', { status: 'paused' }, 'user-1');
    expect(result.status).toBe('paused');
  });

  it('rejects draft -> completed', async () => {
    const prisma = createPrismaMock({ ...baseCampaign, status: 'draft' });
    const service = new CampaignService(prisma);

    await expect(
      service.transitionStatus('tenant-1', 'camp-1', { status: 'completed' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects transitions out of archived', async () => {
    const prisma = createPrismaMock({ ...baseCampaign, status: 'archived' });
    const service = new CampaignService(prisma);

    await expect(
      service.transitionStatus('tenant-1', 'camp-1', { status: 'active' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only allows updating draft campaigns', async () => {
    const prisma = createPrismaMock({ ...baseCampaign, status: 'active' });
    const service = new CampaignService(prisma);

    await expect(
      service.update('tenant-1', 'camp-1', { name: 'New' }, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only allows deleting draft campaigns', async () => {
    const prisma = createPrismaMock({ ...baseCampaign, status: 'active' });
    const service = new CampaignService(prisma);

    await expect(service.delete('tenant-1', 'camp-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
