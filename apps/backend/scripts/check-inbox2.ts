import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const p = new PrismaClient();
async function main() {
  const log = await (p as any).whatsAppMessageLog.findUnique({ 
    where: { id: 'a78356e0-8a9b-48ca-9e17-001221a4f2d1' }
  });
  console.log(JSON.stringify(log, null, 2));
}
main().finally(() => p.$disconnect());
