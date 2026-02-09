
const dotenv = require('dotenv');
dotenv.config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const tenantId = 'test-tenant-cancellation';
    const userId = 'test-owner-cancellation';
    const shopId = 'test-shop-cancellation';

    // 1. Create Tenant
    const tenant = await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        name: 'Test Tenant Cancellation',
        code: 'TESTCANCEL',
        tenantType: 'INDIVIDUAL',
      },
    });

    // 2. Create User
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: 'testcancel@example.com',
        fullName: 'Test Owner',
        role: 'OWNER',
        REMOVED_AUTH_PROVIDERUid: 'test-REMOVED_AUTH_PROVIDER-uid-cancel',
        tenantId: tenantId,
      },
    });

    // 3. Link UserTenant
    await prisma.userTenant.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id,
        },
      },
      update: { role: 'OWNER' },
      create: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'OWNER',
      },
    });

    // 4. Create Shop
    const shop = await prisma.shop.upsert({
      where: { id: shopId },
      update: {},
      create: {
        id: shopId,
        tenantId: tenant.id,
        name: 'Test Shop Cancellation',
        phone: '9999999999',
        addressLine1: 'Test Address Line 1',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        invoicePrefix: 'INV',
        gstEnabled: false,
      },
    });

    // 5. Create active Subscription (Trial)
    // Need a plan first? Assume TRIAL plan exists from seed. if not create one.
    let plan = await prisma.plan.findFirst({ where: { code: 'TRIAL' } });
    if (!plan) {
         plan = await prisma.plan.findFirst(); // Fallback to any plan
    }
    if (!plan) {
        throw new Error("No plan found to subscribe to.");
    }

    await prisma.tenantSubscription.upsert({
        where: { 
            tenantId_module: {
                tenantId: tenant.id,
                module: 'MOBILE_SHOP'
            }
        }, 
        update: { status: 'ACTIVE', endDate: new Date(2100, 0, 1) },
        create: {
            tenantId: tenant.id,
            planId: plan.id,
            module: 'MOBILE_SHOP',
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(2100, 0, 1),
            billingCycle: 'MONTHLY'
        }
    });

    console.log('✅ Created Test User:', user.email);
    console.log('✅ Tenant:', tenant.id);
    console.log('✅ Shop:', shop.id);
    console.log('🔑 Firebase UID:', user.REMOVED_AUTH_PROVIDERUid);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
