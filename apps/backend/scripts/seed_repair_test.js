
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'test@gmail.com' },
    include: {
      userTenants: {
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

  const tenantId = user.userTenants[0]?.tenantId;
  const shopId = user.userTenants[0]?.tenant?.shops[0]?.id;

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
    { name: 'Charging Port Flex', quantity: 15, salePrice: 50000, type: 'SPARE' },
    { name: 'Replacement Battery', quantity: 5, salePrice: 120000, type: 'SPARE' }
  ];

  for (const p of products) {
    await prisma.shopProduct.upsert({
      where: { 
        shopId_name: {
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
        type: p.type,
        isActive: true
      }
    });
  }

  // 3. Create Job Cards for testing various features
  
  // Job A: Auto Fault Detection (Complaint: "phone is not charging properly")
  const jobA = await prisma.jobCard.upsert({
    where: { shopId_jobNumber: { shopId, jobNumber: 'TEST-001' } },
    update: { suggestedFaultTypeId: ftNotCharging?.id },
    create: {
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

  const jobB = await prisma.jobCard.upsert({
    where: { shopId_jobNumber: { shopId, jobNumber: 'TEST-002' } },
    update: { updatedAt: twoDaysAgo },
    create: {
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
  const jobC = await prisma.jobCard.upsert({
    where: { shopId_jobNumber: { shopId, jobNumber: 'TEST-003' } },
    update: {},
    create: {
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
