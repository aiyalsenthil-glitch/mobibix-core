import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const p = new PrismaClient();
async function main() {
  const logs = await (p as any).whatsAppMessageLog.findMany({ 
    where: { tenantId: 'cmmrfiz9x0004oj22u62jipnb' }, 
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { id: true, phoneNumber: true, body: true, direction: true, createdAt: true }
  });
  console.log(JSON.stringify(logs, null, 2));
}
main().finally(() => p.$disconnect());
