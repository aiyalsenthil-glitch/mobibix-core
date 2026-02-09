
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
        where: { code: 'CRM_ADDON' },
        update: {},
        create: {
            code: 'CRM_ADDON',
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
        addon: 'WHATSAPP_CRM',
        action: 'ENABLE',
        planId: crmPlan.id
    });

    const tenantAfterEnable = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const crmSub = await prisma.tenantSubscription.findFirst({
        where: { tenantId, module: 'WHATSAPP_CRM' }
    });

    console.log('Tenant WhatsApp Enabled:', tenantAfterEnable?.whatsappCrmEnabled);
    console.log('CRM Subscription:', crmSub);

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
        addon: 'WHATSAPP_CRM',
        action: 'DISABLE'
    });

    const tenantAfterDisable = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const crmSubDisabled = await prisma.tenantSubscription.findFirst({
        where: { tenantId, module: 'WHATSAPP_CRM' }
    });

    console.log('Tenant WhatsApp Enabled:', tenantAfterDisable?.whatsappCrmEnabled);
    console.log('CRM Subscription Status:', crmSubDisabled?.status);

    if (tenantAfterDisable?.whatsappCrmEnabled || crmSubDisabled?.status !== 'CANCELLED') {
        throw new Error('❌ Disable Addon failed');
    }
    console.log('✅ Disable Addon Successful');

    console.log('\n🎉 ALL TESTS PASSED!');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
  } finally {
    await app.close();
  }
}

verifyAdminFeatures();
