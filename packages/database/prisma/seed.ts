import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Tenant A
  const tenantA = await prisma.tenant.upsert({
    where: { slug: 'rdcs-tenant-a' },
    update: { name: 'RDCS Tenant A' },
    create: {
      name: 'RDCS Tenant A',
      slug: 'rdcs-tenant-a',
    },
  });

  const orgA = await prisma.organization.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenantA.id,
        slug: 'tenant-a-org',
      },
    },
    update: { name: 'Tenant A Organization' },
    create: {
      tenantId: tenantA.id,
      name: 'Tenant A Organization',
      slug: 'tenant-a-org',
      type: 'organization',
    },
  });

  const adminRoleA = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenantA.id,
        name: 'Tenant Administrator',
      },
    },
    update: { description: 'Tenant administrator role' },
    create: {
      tenantId: tenantA.id,
      name: 'Tenant Administrator',
      description: 'Tenant administrator role',
      isSystem: true,
    },
  });

  const agentRoleA = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenantA.id,
        name: 'Agent',
      },
    },
    update: { description: 'Agent role' },
    create: {
      tenantId: tenantA.id,
      name: 'Agent',
      description: 'Agent role',
      isSystem: true,
    },
  });

  const permissions = [
    { resource: 'system', action: 'read', scope: 'tenant' },
    { resource: 'users', action: 'read', scope: 'tenant' },
    { resource: 'users', action: 'create', scope: 'tenant' },
    { resource: 'users', action: 'update', scope: 'tenant' },
    { resource: 'users', action: 'delete', scope: 'tenant' },
    { resource: 'calls', action: 'read', scope: 'tenant' },
    { resource: 'calls', action: 'create', scope: 'tenant' },
    { resource: 'calls', action: 'update', scope: 'tenant' },
    { resource: 'contacts', action: 'read', scope: 'tenant' },
    { resource: 'contacts', action: 'create', scope: 'tenant' },
    { resource: 'contacts', action: 'update', scope: 'tenant' },
    { resource: 'campaigns', action: 'read', scope: 'tenant' },
    { resource: 'campaigns', action: 'create', scope: 'tenant' },
    { resource: 'campaigns', action: 'update', scope: 'tenant' },
  ];

  for (const permissionInput of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        tenantId_resource_action_scope: {
          tenantId: tenantA.id,
          resource: permissionInput.resource,
          action: permissionInput.action,
          scope: permissionInput.scope,
        },
      },
      update: {},
      create: {
        tenantId: tenantA.id,
        ...permissionInput,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRoleA.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRoleA.id,
        permissionId: permission.id,
      },
    });
  }

  const agentPermissions = permissions.filter((p) =>
    ['calls', 'contacts'].includes(p.resource),
  );

  for (const permissionInput of agentPermissions) {
    const permission = await prisma.permission.findFirst({
      where: {
        tenantId: tenantA.id,
        resource: permissionInput.resource,
        action: permissionInput.action,
        scope: permissionInput.scope,
      },
    });

    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: agentRoleA.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: agentRoleA.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const adminUserA = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantA.id,
        email: 'admin@tenant-a.local',
      },
    },
    update: {
      organizationId: orgA.id,
      firstName: 'Tenant A',
      lastName: 'Administrator',
      status: 'active',
    },
    create: {
      tenantId: tenantA.id,
      organizationId: orgA.id,
      email: 'admin@tenant-a.local',
      passwordHash: '$2b$10$uk6RdCGRUJRpnj2PHOBsBeQlnCXtMJPXejCTOEi16qV8KxgWwAnOy',
      firstName: 'Tenant A',
      lastName: 'Administrator',
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUserA.id,
        roleId: adminRoleA.id,
      },
    },
    update: {},
    create: {
      userId: adminUserA.id,
      roleId: adminRoleA.id,
    },
  });

  const agentUserA = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantA.id,
        email: 'agent@tenant-a.local',
      },
    },
    update: {
      organizationId: orgA.id,
      firstName: 'Tenant A',
      lastName: 'Agent',
      status: 'active',
    },
    create: {
      tenantId: tenantA.id,
      organizationId: orgA.id,
      email: 'agent@tenant-a.local',
      passwordHash: '$2b$10$uk6RdCGRUJRpnj2PHOBsBeQlnCXtMJPXejCTOEi16qV8KxgWwAnOy',
      firstName: 'Tenant A',
      lastName: 'Agent',
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: agentUserA.id,
        roleId: agentRoleA.id,
      },
    },
    update: {},
    create: {
      userId: agentUserA.id,
      roleId: agentRoleA.id,
    },
  });

  // Tenant B - for cross-tenant testing
  const tenantB = await prisma.tenant.upsert({
    where: { slug: 'rdcs-tenant-b' },
    update: { name: 'RDCS Tenant B' },
    create: {
      name: 'RDCS Tenant B',
      slug: 'rdcs-tenant-b',
    },
  });

  const orgB = await prisma.organization.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenantB.id,
        slug: 'tenant-b-org',
      },
    },
    update: { name: 'Tenant B Organization' },
    create: {
      tenantId: tenantB.id,
      name: 'Tenant B Organization',
      slug: 'tenant-b-org',
      type: 'organization',
    },
  });

  const adminRoleB = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenantB.id,
        name: 'Tenant Administrator',
      },
    },
    update: { description: 'Tenant administrator role' },
    create: {
      tenantId: tenantB.id,
      name: 'Tenant Administrator',
      description: 'Tenant administrator role',
      isSystem: true,
    },
  });

  const agentRoleB = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenantB.id,
        name: 'Agent',
      },
    },
    update: { description: 'Agent role' },
    create: {
      tenantId: tenantB.id,
      name: 'Agent',
      description: 'Agent role',
      isSystem: true,
    },
  });

  for (const permissionInput of permissions) {
    const permission = await prisma.permission.upsert({
      where: {
        tenantId_resource_action_scope: {
          tenantId: tenantB.id,
          resource: permissionInput.resource,
          action: permissionInput.action,
          scope: permissionInput.scope,
        },
      },
      update: {},
      create: {
        tenantId: tenantB.id,
        ...permissionInput,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRoleB.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRoleB.id,
        permissionId: permission.id,
      },
    });
  }

  for (const permissionInput of agentPermissions) {
    const permission = await prisma.permission.findFirst({
      where: {
        tenantId: tenantB.id,
        resource: permissionInput.resource,
        action: permissionInput.action,
        scope: permissionInput.scope,
      },
    });

    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: agentRoleB.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: agentRoleB.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const adminUserB = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantB.id,
        email: 'admin@tenant-b.local',
      },
    },
    update: {
      organizationId: orgB.id,
      firstName: 'Tenant B',
      lastName: 'Administrator',
      status: 'active',
    },
    create: {
      tenantId: tenantB.id,
      organizationId: orgB.id,
      email: 'admin@tenant-b.local',
      passwordHash: '$2b$10$uk6RdCGRUJRpnj2PHOBsBeQlnCXtMJPXejCTOEi16qV8KxgWwAnOy',
      firstName: 'Tenant B',
      lastName: 'Administrator',
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUserB.id,
        roleId: adminRoleB.id,
      },
    },
    update: {},
    create: {
      userId: adminUserB.id,
      roleId: adminRoleB.id,
    },
  });

  const agentUserB = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantB.id,
        email: 'agent@tenant-b.local',
      },
    },
    update: {
      organizationId: orgB.id,
      firstName: 'Tenant B',
      lastName: 'Agent',
      status: 'active',
    },
    create: {
      tenantId: tenantB.id,
      organizationId: orgB.id,
      email: 'agent@tenant-b.local',
      passwordHash: '$2b$10$uk6RdCGRUJRpnj2PHOBsBeQlnCXtMJPXejCTOEi16qV8KxgWwAnOy',
      firstName: 'Tenant B',
      lastName: 'Agent',
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: agentUserB.id,
        roleId: agentRoleB.id,
      },
    },
    update: {},
    create: {
      userId: agentUserB.id,
      roleId: agentRoleB.id,
    },
  });

  console.info(
    `Seeded tenants ${tenantA.slug} and ${tenantB.slug} with users for cross-tenant testing`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
