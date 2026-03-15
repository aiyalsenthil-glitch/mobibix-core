import { PrismaClient } from '@prisma/client';

async function simulateListRoles() {
  const prisma = new PrismaClient();
  try {
    // Simulate exact backend listRoles for "Aiyal Technologies" tenant
    const tenantId = 'cmmf1d9rq0008levotuo1ydee';

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledModules: true },
    });
    const allowedModules = ['CORE', ...(tenant?.enabledModules || [])];
    console.log('Allowed modules:', allowedModules);

    const roles = await prisma.role.findMany({
      where: {
        deletedAt: null,
        OR: [
          { tenantId: null },
          { tenantId },
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: {
              include: { resource: true },
            },
          },
        },
      },
      orderBy: { isSystem: 'desc' },
    });

    console.log('Roles from DB (before filter):', roles.length);

    const filteredRoles = roles.filter((role) => {
      if (!role.isSystem) return true;
      if (role.rolePermissions.length === 0) return true;
      const ok = role.rolePermissions.every((rp) =>
        allowedModules.includes(rp.permission.resource.moduleType),
      );
      if (!ok) {
        const modules = Array.from(new Set(role.rolePermissions.map(rp => rp.permission.resource.moduleType)));
        console.log(`Role "${role.name}" FILTERED OUT. Modules: ${modules.join(', ')} not all in allowedModules`);
      }
      return ok;
    });

    console.log('After filter:', filteredRoles.length, 'roles');
    const systemRoles = filteredRoles.filter(r => r.isSystem);
    console.log('System roles (templates):', systemRoles.map(r => r.name));

    // Final mapped result
    const mapped = filteredRoles.map((role) => {
      const { rolePermissions, ...rest } = role;
      return { ...rest, permissions: rolePermissions.map(m => `${m.permission.resource.moduleType.toLowerCase()}.${m.permission.resource.name}.${m.permission.action}`) };
    });

    const systemMapped = mapped.filter(r => r.isSystem);
    console.log('\n=== FINAL API RESPONSE (system roles) ===');
    console.log(JSON.stringify(systemMapped.map(r => ({ name: r.name, permCount: r.permissions.length })), null, 2));

  } finally {
    await prisma.$disconnect();
  }
}

simulateListRoles();
