import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../core/prisma/prisma.service';
import { SubscriptionStatus, BillingCycle } from '@prisma/client';
import axios from 'axios';

async function testAddonSystem() {
  console.log('🚀 Initializing NestJS App Context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const API_URL = 'http://localhost_REPLACED:3000/api';
    const JWT_TOKEN = process.env.TEST_JWT_TOKEN;

    console.log('🧪 Starting Add-on System Verification...');

    // 1. Find a test tenant with an active subscription
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
      console.error('❌ No active tenant found for testing');
      return;
    }

    const sub = tenant.subscription[0];
    console.log(`✅ Found tenant: ${tenant.name} (${tenant.id}) with sub ${sub.id}`);

    // 2. Find an addon plan
    const addonPlan = await prisma.plan.findFirst({
      where: { isAddon: true, isActive: true }
    });

    if (!addonPlan) {
      console.error('❌ No add-on plan found in database');
      return;
    }
    console.log(`✅ Found add-on plan: ${addonPlan.name} (${addonPlan.id})`);

    // 3. Test generic buyAddon endpoint (via Axios)
    if (JWT_TOKEN) {
        console.log('🚀 Testing POST /billing/subscription/addons...');
        try {
          const buyRes = await axios.post(`${API_URL}/billing/subscription/addons`, {
            addonPlanId: addonPlan.id,
            billingCycle: BillingCycle.MONTHLY,
            autoRenew: true
          }, {
            headers: { Authorization: `Bearer ${JWT_TOKEN}` }
          });
          console.log('✅ buyAddon response:', buyRes.data);
        } catch (e: any) {
          console.log('⚠️ buyAddon failed (maybe already active):', e.response?.data || e.message);
        }
    } else {
        console.warn('⚠️ Skipping Axios tests: TEST_JWT_TOKEN not set');
    }

    // 4. Verify in DB
    const addonRecord = await prisma.subscriptionAddon.findFirst({
      where: { subscriptionId: sub.id, addonPlanId: addonPlan.id }
    });

    if (addonRecord) {
      console.log('✅ Addon record found in DB:', addonRecord);
      if (addonRecord.endDate.getTime() !== sub.endDate.getTime()) {
         console.error('❌ Co-terminus logic failed! End dates do not match.');
      } else {
         console.log('✅ Co-terminus logic verified: End dates match.');
      }
    }

    // 5. Test merging in GET /current (via Axios)
    if (JWT_TOKEN) {
        console.log('🚀 Testing GET /billing/subscription/current feature merging...');
        const currentRes = await axios.get(`${API_URL}/billing/subscription/current`, {
          headers: { Authorization: `Bearer ${JWT_TOKEN}` }
        });
        
        const mergedFeatures = currentRes.data.current.features;
        console.log('✅ Merged features:', mergedFeatures);
        
        // Check if addon features are included
        const addonFeatures = await prisma.planFeature.findMany({
          where: { planId: addonPlan.id, enabled: true }
        });
        
        for (const f of addonFeatures) {
           if (!mergedFeatures.includes(f.feature)) {
              console.error(`❌ Feature ${f.feature} from addon missing in response!`);
           } else {
              console.log(`✅ Feature ${f.feature} merging verified.`);
           }
        }
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await app.close();
  }
}

testAddonSystem();
