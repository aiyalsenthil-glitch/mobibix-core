import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Explicitly load .env from root or backend root
// dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
// Fallback to local .env if above not found
// dotenv.config();

// User provided connection string
const CONNECTION_STRING =
  process.env.DIRECT_URL || process.env.DATABASE_URL || '';

import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
class CustomPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Manually initialize adapter with custom connection string
    const adapter = new PrismaPg({ connectionString: CONNECTION_STRING });
    super({ adapter } as any);
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

// Minimal module to bootstrap context

// Minimal module to bootstrap context
@Module({
  providers: [CustomPrismaService],
})
class ScriptModule {}

async function main() {
  // Creating Nest Context just to get the service seems heavy but ensures correct DI config
  // Alternatively, just instantiate PrismaService if it's simple

  // Let's try direct instantiation first as it extends PrismaClient
  const prisma = new CustomPrismaService();
  await prisma.onModuleInit(); // Connect

  // List all tenants to find the right one
  const allTenants = await prisma.tenant.findMany({
    select: { id: true, name: true, code: true },
  });

  console.table(allTenants);

  // Still try to debug the one we found earlier if possible, or pick the first one
  const targetTenant =
    allTenants.find(
      (t) => t.name.includes('Test') || t.name.includes('Demo'),
    ) || allTenants[0];
  const tenantId = targetTenant ? targetTenant.id : 'cml1wu3670006v4lei0qkk97a';


  try {
    const tenants: any[] =
      await prisma.$queryRaw`SELECT * FROM "Tenant" WHERE id = ${tenantId} LIMIT 1`;
    if (tenants.length > 0) {

    } else {

    }
  } catch (e) {
    console.error('Error querying Tenant:', e);
  }

  // Check WhatsApp Settings

  const settings: any[] =
    await prisma.$queryRaw`SELECT * FROM "WhatsAppSetting" WHERE "tenantId" = ${tenantId}`;

  if (settings.length > 0) {
    const setting = settings[0];


    if (setting.enabled === false) {


      await prisma.$executeRaw`UPDATE "WhatsAppSetting" SET "enabled" = true WHERE "tenantId" = ${tenantId}`;

    } else {

    }
  } else {
    console.log('NULL (No settings record found -> Should default to Enabled)');
  }


  const plans = await prisma.plan.findMany();
  console.log(
    plans.map((p: any) => ({ id: p.id, code: p.code, name: p.name })),
  );

  await prisma.$disconnect();
}

main().catch(console.error);
