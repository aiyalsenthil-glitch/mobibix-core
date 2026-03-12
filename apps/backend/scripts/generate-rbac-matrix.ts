import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

async function generateMatrix() {
  console.log('📊 Generating Permission Matrix...');

  // 1. Fetch all roles
  const roles = await prisma.role.findMany({
    where: { deletedAt: null },
    include: {
      rolePermissions: {
        include: {
          permission: {
            include: { resource: true },
          },
        },
      },
    },
  });

  // 2. Fetch all permissions available in the system
  const allPermissions = await prisma.permission.findMany({
    include: { resource: true },
    orderBy: [
      { resource: { moduleType: 'asc' } },
      { resource: { name: 'asc' } },
      { action: 'asc' },
    ],
  });

  const matrix: any[] = [];

  // Metadata for the matrix
  const headers = ['Permission', ...roles.map(r => r.name)];
  
  for (const perm of allPermissions) {
    const permString = `${perm.resource.moduleType}.${perm.resource.name}.${perm.action}`;
    const row: any = {
      Permission: permString,
    };

    for (const role of roles) {
      const hasPerm = role.rolePermissions.some(rp => rp.permissionId === perm.id);
      row[role.name] = hasPerm ? '✅' : '❌';
    }
    matrix.push(row);
  }

  // Save as JSON
  const outputPath = resolve(__dirname, '../rbac-matrix.json');
  writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    roles: roles.map(r => ({ id: r.id, name: r.name, isSystem: r.isSystem })),
    matrix,
  }, null, 2));

  // Save as simple CSV for Excel
  const csvHeaders = headers.join(',');
  const csvRows = matrix.map(row => {
    return headers.map(h => row[h]).join(',');
  });
  const csvContent = [csvHeaders, ...csvRows].join('\n');
  const csvPath = resolve(__dirname, '../rbac-matrix.csv');
  writeFileSync(csvPath, csvContent);

  console.log(`✅ Matrix generated!`);
  console.log(`JSON: ${outputPath}`);
  console.log(`CSV: ${csvPath}`);
  
  await prisma.$disconnect();
}

generateMatrix().catch(err => {
  console.error('Failed to generate matrix:', err);
  process.exit(1);
});
