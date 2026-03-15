import Razorpay from 'REMOVED_PAYMENT_INFRA';
import * as dotenv from 'dotenv';
import { PrismaClient, BillingCycle, ModuleType } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();
const REMOVED_PAYMENT_INFRA = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

async function main() {
  console.log('🚀 Creating a Temporary One-Day (Daily) Plan in Razorpay...');

  try {
    // 1. Create Plan in Razorpay
    const rzpPlan = await REMOVED_PAYMENT_INFRA.plans.create({
      period: 'weekly',
      interval: 1,
      item: {
        name: 'Test One-Day Plan',
        amount: 50000, // ₹500
        currency: 'INR',
        description: 'Temporary plan for testing one-day cycle'
      }
    });

    console.log('✅ Razorpay Plan Created:', rzpPlan.id);

    // 2. Add to Local Database (so our system recognizes it)
    const localPlan = await prisma.plan.upsert({
      where: { code: 'TEST_DAILY' },
      update: {
        name: 'Test One-Day Plan',
        module: ModuleType.MOBILE_SHOP
      },
      create: {
        name: 'Test One-Day Plan',
        code: 'TEST_DAILY',
        description: 'Temporary plan for testing one-day cycle',
        level: 1,
        maxMembers: 100,
        maxStaff: 5,
        isActive: true,
        module: ModuleType.MOBILE_SHOP,
      }
    });

    console.log('✅ Local Plan Updated/Created:', localPlan.id);
    
    // 3. Update Pricing
    await prisma.planPrice.upsert({
      where: { 
        planId_billingCycle_currency: {
          planId: localPlan.id,
          billingCycle: BillingCycle.MONTHLY,
          currency: 'INR'
        }
      },
      update: { 
        price: 50000,
        REMOVED_PAYMENT_INFRAPlanId: rzpPlan.id
      },
      create: {
        planId: localPlan.id,
        billingCycle: BillingCycle.MONTHLY,
        currency: 'INR',
        price: 50000,
        REMOVED_PAYMENT_INFRAPlanId: rzpPlan.id,
        isActive: true
      }
    });

    console.log('📅 Plan is ready for subscription testing.');
    console.log('👉 Razorpay Plan ID:', rzpPlan.id);

  } catch (error: any) {
    console.error('❌ Failed to create plan:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
