
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Injectable, OnModuleInit, OnModuleDestroy, Module } from '@nestjs/common';

const CONNECTION_STRING = "postgresql://postgres:k%2FWwZ9M!gJagvq6@db.wdjyrnldcsotkgoqcsfz.supabase.co:5432/postgres";

@Injectable()
class CustomPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: CONNECTION_STRING });
    super({ adapter } as any);
  }
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}

@Module({
  providers: [CustomPrismaService],
})
class ScriptModule {}

async function main() {
  const prisma = new CustomPrismaService();
  await prisma.onModuleInit();

  const tenantId = 'cml1wr3e30003v4lehu8sbd5b';
  const planName = 'ULTIMATE';

  console.log(`Fixing subscription for Tenant: ${tenantId}`);

  // 1. Find Plan
  const plan = await prisma.plan.findFirst({
    where: { name: planName },
  });

  if (!plan) {
    throw new Error(`Plan ${planName} not found!`);
  }
  console.log(`Found Plan: ${plan.name} (${plan.id})`);

  // 2. Check existing
  const existing = await prisma.tenantSubscription.findFirst({
    where: { tenantId, status: 'ACTIVE' }
  });

  if (existing) {
    console.log('Active subscription already exists:', existing.id);
  } else {
    // 3. Create Subscription
    const sub = await prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date('2099-12-31'), // Lifetime
      }
    });
    console.log('✅ Created Active Subscription:', sub.id);
  }

  // 4. Debug Plan Features
  const ultimatePlan = await prisma.plan.findFirst({ where: { name: 'ULTIMATE' } });
  if (ultimatePlan) {
    const features = await prisma.planFeature.findMany({ where: { planId: ultimatePlan.id } });
    console.log('ULTIMATE Plan Features:', JSON.stringify(features, null, 2));
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
