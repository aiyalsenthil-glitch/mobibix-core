import { PrismaService } from '../src/core/prisma/prisma.service';

const prisma = new PrismaService();

async function check() {
  console.log('Models available in PrismaService:');
  const models = Object.keys(prisma).filter(
    (k) => !k.startsWith('_') && !k.startsWith('$'),
  );
  console.log(models);

  if (models.includes('partner')) {
    console.log('✅ Partner model exists on PrismaService');
  } else {
    console.log('❌ Partner model MISSING on PrismaService');
  }
}

check().then(() => process.exit(0));
