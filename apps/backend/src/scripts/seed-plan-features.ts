
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Module, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

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

  console.log('--- Seeding Plan Features for ULTIMATE ---');

  const ultimate = await prisma.plan.findFirst({
    where: { 
      OR: [{ name: 'ULTIMATE' }, { code: 'ULTIMATE' }]
    }
  });

  if (!ultimate) {
    throw new Error('Ultimate plan not found!');
  }
  console.log(`Found Plan: ${ultimate.name} (${ultimate.id})`);

  const featuresToSeed = [
    { code: 'WELCOME', name: 'Welcome Message' },
    { code: 'EXPIRY', name: 'Expiry Reminder' },
    { code: 'PAYMENT_DUE', name: 'Payment Due Reminder' },
    { code: 'REMINDER', name: 'Custom Reminder' },
  ];

  for (const feat of featuresToSeed) {
    // Check if exists
    const existing = await prisma.planFeature.findFirst({
      where: {
        planId: ultimate.id,
        feature: feat.code as any,
      }
    });

    if (existing) {
      console.log(`- [SKIP] ${feat.code} already exists.`);
    } else {
      await prisma.planFeature.create({
        data: {
          planId: ultimate.id,
          feature: feat.code as any,
        }
      });
      console.log(`- [ADD] ${feat.code} added.`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
