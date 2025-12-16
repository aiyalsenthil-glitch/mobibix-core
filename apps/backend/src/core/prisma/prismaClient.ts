// apps/backend/src/prismaClient.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma:
    | PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>
    | undefined;
}

// Create a PrismaClient once and reuse it across hot reloads (Node + Nest dev)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL env var for Prisma adapter');
}
const adapter = new PrismaPg({ connectionString });
const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ adapter });
// Store on globalThis so it survives module reloads in dev
if (!globalThis.__prisma) {
  globalThis.__prisma = prisma;
}

function gracefulDisconnect(): void {
  prisma.$disconnect().catch((err: unknown) => {
    if (err instanceof Error) {
      console.error('[Prisma] Error during disconnect:', err.message);
    } else {
      console.error('[Prisma] Unknown disconnect error:', err);
    }
  });
}

process.on('beforeExit', () => {
  gracefulDisconnect();
});
process.on('SIGINT', () => {
  gracefulDisconnect();
  process.exit(0);
});
process.on('SIGTERM', () => {
  gracefulDisconnect();
  process.exit(0);
});

export default prisma;
