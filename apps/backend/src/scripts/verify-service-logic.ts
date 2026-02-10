import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../core/prisma/prisma.service';
import { SubscriptionsService } from '../core/billing/subscriptions/subscriptions.service';
import { SubscriptionStatus, BillingCycle } from '@prisma/client';

async function verifyServiceLogic() {
  console.log('🚀 Initializing NestJS App Context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const subscriptionsService = app.get(SubscriptionsService);

    console.log('🧪 Verifying SubscriptionsService Add-on Logic...');

    // 1. Find a test tenant
    const tenant = await prisma.tenant.findFirst({
      where: { deletedAt: null },
      include: {
        subscription: {
          where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
          take: 1
        }
      }
    });

    if (!tenant || tenant.subscription.length === 0) {
      console.error('❌ No active tenant found');
      return;
    }

    const sub = tenant.subscription[0];
    console.log(`✅ Tenant: ${tenant.name}, Sub: ${sub.id}, EndDate: ${sub.endDate}`);

    // 2. Find an addon plan
    const addonPlan = await prisma.plan.findFirst({
      where: { isAddon: true, isActive: true }
    });

    if (!addonPlan) {
      console.error('❌ No addon plan found');
      return;
    }

    // 3. Test buyAddon
    console.log(`🚀 Calling buyAddon for ${addonPlan.name}...`);
    const result = await subscriptionsService.buyAddon({
      subscriptionId: sub.id,
      addonPlanId: addonPlan.id,
      billingCycle: BillingCycle.MONTHLY,
      autoRenew: true
    });

    console.log('✅ buyAddon result:', result);

    if (result.endDate.getTime() === sub.endDate.getTime()) {
      console.log('✅ Co-terminus logic verified: Addon expiry matches parent.');
    } else {
      console.error('❌ Co-terminus logic failed! Dates do not match.');
    }

    // 4. Test manageAddon (ENABLE) - legacy flag check
    console.log('🚀 Testing manageAddon (ENABLE) legacy flags...');
    const whatsappAddon = await prisma.plan.findFirst({ where: { code: 'WHATSAPP_CRM' } });
    if (whatsappAddon) {
        await subscriptionsService.manageAddon(tenant.id, 'ENABLE', whatsappAddon.id);
        const updatedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } });
        if (updatedTenant?.whatsappCrmEnabled) {
            console.log('✅ Legacy whatsappCrmEnabled flag verified.');
        } else {
            console.error('❌ Legacy flag NOT set!');
        }
    }

    // 5. Test manageAddon (DISABLE)
    console.log('🚀 Testing manageAddon (DISABLE)...');
    await subscriptionsService.manageAddon(tenant.id, 'DISABLE', addonPlan.id);
    const disabledAddon = await prisma.subscriptionAddon.findUnique({
      where: {
        subscriptionId_addonPlanId: {
          subscriptionId: sub.id,
          addonPlanId: addonPlan.id
        }
      }
    });

    if (disabledAddon?.status === SubscriptionStatus.CANCELLED) {
      console.log('✅ manageAddon (DISABLE) verified.');
    } else {
      console.error('❌ DISABLE failed! Status:', disabledAddon?.status);
    }

  } catch (e: any) {
    console.error('❌ Error during verification:', e.message);
  } finally {
    await app.close();
  }
}

verifyServiceLogic();
