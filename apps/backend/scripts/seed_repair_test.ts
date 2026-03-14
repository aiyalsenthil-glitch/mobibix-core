
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'test@gmail.com' },
    include: {
      tenants: {
        include: {
          tenant: {
            include: {
              shops: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    console.error('User test@gmail.com not found');
    return;
  }

  const tenantId = user.tenants[0]?.tenantId;
  const shopId = user.tenants[0]?.tenant?.shops[0]?.id;

  if (!tenantId || !shopId) {
    console.error('Tenant or Shop not found for user');
    return;
  }

  console.log(`Feeding data for Tenant: ${tenantId}, Shop: ${shopId}, User: ${user.id}`);

  // 1. Ensure FaultTypes exist
  const faultTypes = [
    { name: 'Not Charging' },
    { name: 'No Display' },
    { name: 'Battery Issue' }
  ];

  for (const ft of faultTypes) {
    await prisma.faultType.upsert({
      where: { name: ft.name },
      update: {},
      create: { name: ft.name }
    });
  }

  const ftNotCharging = await prisma.faultType.findUnique({ where: { name: 'Not Charging' } });

  // 2. Ensure ShopProducts exist for parts suggestion
  const products = [
    { name: 'Charging Port Flex', quantity: 15, salePrice: 50000, type: 'PART' },
    { name: 'Replacement Battery', quantity: 5, salePrice: 120000, type: 'PART' }
  ];

  for (const p of products) {
    await prisma.shopProduct.upsert({
      where: { 
        tenantId_shopId_name: {
          tenantId,
          shopId,
          name: p.name
        }
      },
      update: { quantity: p.quantity },
      create: {
        tenantId,
        shopId,
        name: p.name,
        quantity: p.quantity,
        salePrice: p.salePrice,
        type: p.type as any,
        isActive: true
      }
    });
  }

  // 3. Create Job Cards for testing various features
  
  // Job A: Auto Fault Detection (Complaint: "phone is not charging properly")
  await prisma.jobCard.create({
    data: {
      tenantId,
      shopId,
      jobNumber: 'TEST-001',
      publicToken: 'token-001',
      customerName: 'Alice Test',
      customerPhone: '1234567890',
      deviceType: 'Smartphone',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 13',
      customerComplaint: 'phone is not charging properly',
      status: 'RECEIVED',
      createdByUserId: user.id,
      createdByName: 'Test Admin',
      suggestedFaultTypeId: ftNotCharging?.id
    }
  });

  // Job B: Technician Queue & Bottleneck (Stuck in DIAGNOSING for 48h)
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  await prisma.jobCard.create({
    data: {
      tenantId,
      shopId,
      jobNumber: 'TEST-002',
      publicToken: 'token-002',
      customerName: 'Bob Test',
      customerPhone: '0987654321',
      deviceType: 'Smartphone',
      deviceBrand: 'Samsung',
      deviceModel: 'S22 Ultra',
      customerComplaint: 'Screen is black',
      status: 'DIAGNOSING',
      assignedToUserId: user.id,
      createdByUserId: user.id,
      createdByName: 'Test Admin',
      updatedAt: twoDaysAgo
    }
  });

  // Job C: QC Check Needed (IN_PROGRESS)
  await prisma.jobCard.create({
    data: {
      tenantId,
      shopId,
      jobNumber: 'TEST-003',
      publicToken: 'token-003',
      customerName: 'Charlie Test',
      customerPhone: '1122334455',
      deviceType: 'Smartphone',
      deviceBrand: 'Google',
      deviceModel: 'Pixel 7',
      customerComplaint: 'Battery drain',
      status: 'IN_PROGRESS',
      assignedToUserId: user.id,
      createdByUserId: user.id,
      createdByName: 'Test Admin',
      laborCharge: 200,
      estimatedCost: 1500
    }
  });

  console.log('✅ Test data fed successfully');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
