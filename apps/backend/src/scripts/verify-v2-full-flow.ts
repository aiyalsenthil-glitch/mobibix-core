import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../core/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const eventEmitter = app.get(EventEmitter2);

  console.log('🧪 Starting Functional Verification System...');

  // 1. SETUP: Create/Find a tenant for test
  let tenant = await prisma.tenant.findFirst({ where: { name: 'Functional Test Gym' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { 
        name: 'Functional Test Gym', 
        code: 'F_TEST_GYM_' + Date.now(),
        status: 'ACTIVE', 
        tenantType: 'GYM' 
      }
    });
  }
  const tid = tenant.id;
  (prisma as any).setTenantId(tid); // Set context for multi-tenant models

  // 2. TRIGGER: Emit a subscription.suspended event
  console.log('--- Step 1: Emitting subscription.suspended ---');
  await eventEmitter.emitAsync('subscription.suspended', {
    tenantId: tid,
    module: 'GYM',
    reason: 'Auto-verified test event'
  });

  // 3. VERIFY: Notification Log
  console.log('--- Step 2: Verifying NotificationLog ---');
  setTimeout(async () => {
    const log = await prisma.notificationLog.findFirst({
      where: { tenantId: tid, eventId: 'subscription.suspended' },
      orderBy: { createdAt: 'desc' },
      include: { tenant: true }
    });

    if (log) {
      console.log('✅ Log Found:', {
        id: log.id,
        status: log.status,
        recipient: log.recipient,
        tenantName: log.tenant.name
      });
    } else {
      console.log('❌ Log not found!');
    }

    // 4. TEST: Compliance Flow
    console.log('--- Step 3: Testing Deletion Lifecycle ---');
    const existingReq = await prisma.deletionRequest.findFirst({ where: { tenantId: tid } });
    let rid = existingReq?.id;
    if (!rid) {
      const delReq = await prisma.deletionRequest.create({
        data: {
          tenantId: tid,
          requestedBy: 'admin',
          reason: 'Manual validation',
          status: 'PENDING'
        }
      });
      rid = delReq.id;
    }

    // Capture initial status
    const initialT = await prisma.tenant.findUnique({ where: { id: tid } });
    console.log(`   Initial Tenant Status: ${initialT?.status}`);

    // Update status to PENDING_DELETION (Simulate request effect)
    await prisma.tenant.update({ where: { id: tid }, data: { status: 'PENDING_DELETION' } });

    // 5. TEST: Stats fetch
    const statsRes = await prisma.tenantSubscription.count({ where: { status: 'PAST_DUE' } });
    console.log(`--- Step 4: Revenue Stats Check ---`);
    console.log(`   Past Due Count in DB: ${statsRes}`);

    console.log('🏁 Verification complete.');
    await app.close();
  }, 2000); // Give time for event bus
}

bootstrap().catch(console.error);
