import dotenv from 'dotenv';
dotenv.config({ path: 'apps/backend/.env' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { HSN_DATA } from './hsn-data';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  // TRIAL
  await prisma.plan.upsert({
    where: { name: 'TRIAL' },
    update: {},
    create: {
      name: 'TRIAL',
      level: 0,
      price: 0,
      durationDays: 14,
    },
  });

  // BASIC
  await prisma.plan.upsert({
    where: { name: 'BASIC' },
    update: {},
    create: {
      name: 'BASIC',
      level: 1,
      price: 999,
      durationDays: 30,
    },
  });
  // PLUS
  await prisma.plan.upsert({
    where: { name: 'PLUS' },
    update: {},
    create: {
      name: 'PLUS',
      level: 2,
      price: 149,
      durationDays: 30,
    },
  });

  // PRO
  await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      level: 3,
      price: 1999,
      durationDays: 365,
    },
  });

  //ULTIMATE
  await prisma.plan.upsert({
    where: { name: 'ULTIMATE' },
    update: {},
    create: {
      name: 'ULTIMATE',
      level: 4,
      price: 4999,
      durationDays: 365,
    },
  });

  console.log('✅ Plans seeded');

  // HSN DATA
  console.log('🌱 Seeding HSN Data...');
  for (const hsn of HSN_DATA) {
    await prisma.hSNCode.upsert({
      where: { code: hsn.code },
      update: {
        description: hsn.description,
        taxRate: hsn.taxRate,
        isActive: true,
      },
      create: {
        code: hsn.code,
        description: hsn.description,
        taxRate: hsn.taxRate,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${HSN_DATA.length} HSN codes`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
