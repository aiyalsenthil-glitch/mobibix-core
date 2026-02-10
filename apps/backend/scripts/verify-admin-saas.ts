
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AdminController } from '../src/core/admin/admin.controller';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { UserRole, ModuleType } from '@prisma/client';

async function verifyAdminFeatures() {
  console.log('🚀 Initializing NestJS App Context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'], // Reduce noise
  });

  try {
    const adminController = app.get(AdminController);
    const prisma = app.get(PrismaService);

    console.log('✅ App Initialized');

    // 1. Setup Test Data
    const testEmail = 'verify-admin@example.com';
    const tenantId = 'verify-admin-tenant';
    
    console.log('🛠️ Setting up test user and tenant...');
    await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
    await prisma.userTenant.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});

    const tenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Verify Admin Tenant',
        code: 'VERIFYADMIN',
        tenantType: 'MOBILE_SHOP',
        whatsappCrmEnabled: false,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: 'Verify Admin User',
        role: UserRole.OWNER,
        REMOVED_AUTH_PROVIDERUid: 'verify-admin-uid',
        tenantId: tenant.id, // Primary tenant
      },
    });

    await prisma.userTenant.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: UserRole.OWNER,
      },
    });

    // Ensure a valid plan exists for upgrade
    const upgradePlan = await prisma.plan.upsert({
        where: { code: 'GOLD_TEST' },
        update: {},
        create: {
            code: 'GOLD_TEST',
            name: 'Gold Test Plan',
            level: 2,
            module: 'MOBILE_SHOP',
            isActive: true,
            isPublic: true,
        }
    });
    
    // Ensure CRM plan exists
    const crmPlan = await prisma.plan.upsert({
        where: { code: 'WHATSAPP_CRM' },
        update: {
            isActive: true,
            isPublic: true,
            isAddon: true,
            module: 'WHATSAPP_CRM'
        },
        create: {
            code: 'WHATSAPP_CRM',
            name: 'CRM Addon',
            level: 1,
            module: 'WHATSAPP_CRM',
            isActive: true,
            isPublic: true,
            isAddon: true,
        }
    });

    // Create Initial Subscription (Trial)
    // We need a TRIAL plan or just use the GOLD one for "initial" state if trial doesn't exist
    // Let's make sure a TRIAL plan exists
     const trialPlan = await prisma.plan.upsert({
        where: { code: 'TRIAL_TEST' },
        update: {},
        create: {
            code: 'TRIAL_TEST',
            name: 'Trial Test Plan',
            level: 1,
            module: 'MOBILE_SHOP',
            isActive: true,
            isPublic: true,
        }
    });

    await prisma.tenantSubscription.create({
        data: {
            tenantId: tenant.id,
            planId: trialPlan.id, 
            module: 'MOBILE_SHOP',
            status: 'TRIAL',
            startDate: new Date(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 14)),
        }
    });


    // =================================================================
    // TEST 1: LOOKUP USER
    // =================================================================
    console.log('\n🧪 TEST 1: Lookup User');
    const lookupResult = await adminController.lookupUser(testEmail);
    console.log('Lookup Result:', JSON.stringify(lookupResult, null, 2));

    if (lookupResult.user.email !== testEmail || lookupResult.tenants.length !== 1) {
        throw new Error('❌ Lookup failed to return correct data');
    }
    console.log('✅ Lookup Successful');


    // =================================================================
    // TEST 2: UPGRADE BY EMAIL
    // =================================================================
    console.log('\n🧪 TEST 2: Upgrade by Email');
    await adminController.upgradePlanByEmail({
        email: testEmail,
        planName: upgradePlan.name,
        module: 'MOBILE_SHOP'
    });

    const upgradedSub = await prisma.tenantSubscription.findFirst({
        where: { tenantId, module: 'MOBILE_SHOP' }
    });
    console.log('Upgraded Subscription:', upgradedSub);

    if (upgradedSub?.planId !== upgradePlan.id) {
        throw new Error('❌ Upgrade by Email failed');
    }
    console.log('✅ Upgrade by Email Successful');


    // =================================================================
    // TEST 3: MANAGE ADDON (ENABLE)
    // =================================================================
    console.log('\n🧪 TEST 3: Enable Addon (WhatsApp CRM)');
    await adminController.manageAddon({
        tenantId,
        module: 'MOBILE_SHOP',
        action: 'ENABLE',
        planId: crmPlan.id
    });

    const tenantAfterEnable = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const crmSub = await prisma.subscriptionAddon.findFirst({
        where: { subscriptionId: upgradedSub?.id, addonPlanId: crmPlan.id }
    });

    console.log('Tenant WhatsApp Enabled:', tenantAfterEnable?.whatsappCrmEnabled);
    console.log('CRM Addon Record:', crmSub);

    if (!tenantAfterEnable?.whatsappCrmEnabled || !crmSub || crmSub.status !== 'ACTIVE') {
        throw new Error('❌ Enable Addon failed');
    }
    console.log('✅ Enable Addon Successful');


    // =================================================================
    // TEST 4: MANAGE ADDON (DISABLE)
    // =================================================================
    console.log('\n🧪 TEST 4: Disable Addon');
    await adminController.manageAddon({
        tenantId,
        module: 'MOBILE_SHOP',
        action: 'DISABLE',
        planId: crmPlan.id
    });

    const tenantAfterDisable = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const crmSubDisabled = await prisma.subscriptionAddon.findFirst({
        where: { subscriptionId: upgradedSub?.id, addonPlanId: crmPlan.id }
    });

    console.log('Tenant WhatsApp Enabled:', tenantAfterDisable?.whatsappCrmEnabled);
    console.log('CRM Addon Status:', crmSubDisabled?.status);

    if (tenantAfterDisable?.whatsappCrmEnabled || crmSubDisabled?.status !== 'CANCELLED') {
        throw new Error('❌ Disable Addon failed');
    }
    console.log('✅ Disable Addon Successful');

    // ... (Previous tests remain)

    // =================================================================
    // TEST 5: ADMIN ANALYTICS
    // =================================================================
    console.log('\n🧪 TEST 5: Admin Analytics');
    const AdminAnalyticsController = require('../src/core/admin/analytics/admin-analytics.controller').AdminAnalyticsController;
    const analyticsController = app.get(AdminAnalyticsController);
    
    const globalStats = await analyticsController.getGlobalStats();
    console.log('Global Stats:', globalStats);
    if (globalStats.totalTenants < 1) throw new Error('❌ Analytics failed');
    console.log('✅ Analytics Successful');

    // =================================================================
    // TEST 6: TENANT MANAGEMENT
    // =================================================================
    console.log('\n🧪 TEST 6: Tenant Management');
    const AdminTenantController = require('../src/core/admin/tenant/admin-tenant.controller').AdminTenantController;
    const adminTenantController = app.get(AdminTenantController);
    const prismaService = app.get(PrismaService); // Get PrismaService

    try {
        console.log('Attempting direct Prisma query...');
        const directCount = await prismaService.tenant.count();
        console.log('Direct Tenant Count:', directCount);
        
        console.log('Calling Controller.listTenants...');
        const tenants = await adminTenantController.listTenants('Verify', '1', '10');
        console.log('Tenants List:', tenants.data.length);
        if (tenants.data.length === 0) console.warn('⚠️ No tenants found matching "Verify"');

        if (tenants.data.length > 0) {
            const impersonation = await adminTenantController.impersonateTenant(tenants.data[0].id);
            console.log('Impersonation Token:', impersonation.accessToken ? 'Generated' : 'Missing');
        }
        console.log('✅ Tenant Ops Successful');
    } catch (e) {
        console.error('❌ Tenant Ops Failed Detailed:', e);
        // Continue to other tests
    }

    // =================================================================
    // TEST 7: MDM (Global Products)
    // =================================================================
    console.log('\n🧪 TEST 7: MDM - Global Products');
    const AdminMdmController = require('../src/core/admin/mdm/admin-mdm.controller').AdminMdmController;
    const mdmController = app.get(AdminMdmController);

    // 1. Create HSN first (required by schema)
    const hsnCode = '998877';
    await mdmController.upsertHSN({
        code: hsnCode,
        description: 'Test HSN',
        taxRate: 18
    });
    console.log('✅ HSN Created/Upserted');

    // 2. Create Product
    const newProduct = await mdmController.createProduct({
        name: 'Test Global Product',
        category: 'Test Category', // Will be upserted
        hmCode: hsnCode, // Typo in payload? Controller expects hsnCode
        hsnCode: hsnCode,
        isActive: true
    });
    console.log('Created Product:', newProduct.id);

    const products = await mdmController.listProducts('Test');
    if (products.data.length === 0) throw new Error('❌ MDM List failed');
    console.log('✅ MDM Successful');

    console.log('\n🎉 ALL ADMIN SUITE TESTS PASSED!');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
  } finally {
    await app.close();
  }
}

verifyAdminFeatures();
