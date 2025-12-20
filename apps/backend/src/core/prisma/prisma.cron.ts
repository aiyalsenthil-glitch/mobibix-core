import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export function getCronPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL!,
        },
      },
    } as any); // 👈 required for Prisma v7 TS mismatch
  }

  return prisma;
}
