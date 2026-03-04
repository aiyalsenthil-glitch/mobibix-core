import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NotificationOrchestrator } from '../core/notifications/notification.orchestrator';
import { PrismaService } from '../core/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const orchestrator = app.get(NotificationOrchestrator);
  const prisma = app.get(PrismaService);

  console.log('🚀 Starting Notification System Verification...');

  // 1. Mock a tenant and user for testing if none exist
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { 
        name: 'Test Tenant', 
        domain: 'test.com', 
        status: 'ACTIVE',
        tenantType: 'MOBILE_SHOP',
        code: 'TEST_TENANT_' + Date.now()
      }
    });
  }

  // 2. Test Subscription Suspended Event
  console.log('--- Testing Dispatch: subscription.suspended ---');
  await orchestrator.dispatch({
    tenantId: tenant.id,
    eventId: 'subscription.suspended',
    moduleType: 'MOBILE_SHOP',
    recipient: 'test@example.com',
    data: { reason: 'Payment Failed' }
  });

  // 3. Verify Log creation
  const recentLog = await prisma.notificationLog.findFirst({
    where: { tenantId: tenant.id, eventId: 'subscription.suspended' },
    orderBy: { createdAt: 'desc' }
  });

  if (recentLog) {
    console.log('✅ Notification Log created successfully!');
    console.log(`   ID: ${recentLog.id}`);
    console.log(`   Status: ${recentLog.status}`);
    console.log(`   Recipient: ${recentLog.recipient}`);
  } else {
    console.error('❌ Notification Log NOT found!');
  }

  // 4. Test Deletion Requested Event
  console.log('--- Testing Dispatch: tenant.deletion.requested ---');
  await orchestrator.dispatch({
    tenantId: tenant.id,
    eventId: 'tenant.deletion.requested',
    moduleType: 'MOBILE_SHOP',
    recipient: 'owner@test.com',
    data: { scheduledDate: new Date().toDateString() }
  });

  const delLog = await prisma.notificationLog.findFirst({
    where: { tenantId: tenant.id, eventId: 'tenant.deletion.requested' },
    orderBy: { createdAt: 'desc' }
  });

  if (delLog) {
    console.log('✅ Deletion Request Notification Log created!');
  } else {
    console.error('❌ Deletion Request Notification Log NOT found!');
  }

  await app.close();
  console.log('🏁 Verification complete.');
}

bootstrap().catch(err => {
  console.error('💥 Error during verification:', err);
  process.exit(1);
});
