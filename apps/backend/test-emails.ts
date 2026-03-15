import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmailService } from './src/common/email/email.service';

async function testEmails() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);
  const targetEmail = 'aiyalcomputers@gmail.com';
  const targetTenantId = 'cmmq3ijhj000otvykbu1xmpu7';

  console.log('🚀 Starting Multi-Brand Email Test...');

  try {
    // 1. MobiBix Billing
    console.log('Sending: MobiBix Billing...');
    await emailService.send({
      tenantId: targetTenantId,
      recipientType: 'CUSTOMER' as any,
      emailType: 'INVOICE_GENERATED',
      referenceId: 'test-' + Date.now(),
      module: 'MOBILE_SHOP',
      to: targetEmail,
      subject: 'MobiBix Test: Billing Sender',
      data: { invoiceNumber: 'TEST-MB-001' },
    });

    // 2. MobiBix Support/Team
    console.log('Sending: MobiBix Team...');
    await emailService.send({
      tenantId: targetTenantId,
      recipientType: 'CUSTOMER' as any,
      emailType: 'TENANT_WELCOME',
      referenceId: 'test-' + (Date.now() + 1),
      module: 'MOBILE_SHOP',
      to: targetEmail,
      subject: 'MobiBix Test: Team Sender',
      data: { name: 'Aiyal' },
    });

    // 3. GymPilot Billing
    console.log('Sending: GymPilot Billing...');
    await emailService.send({
      tenantId: targetTenantId,
      recipientType: 'CUSTOMER' as any,
      emailType: 'PAYMENT_SUCCESS',
      referenceId: 'test-' + (Date.now() + 2),
      module: 'GYM',
      to: targetEmail,
      subject: 'GymPilot Test: Billing Sender',
      data: { amount: 1000 },
    });

    // 4. GymPilot Team/Support
    console.log('Sending: GymPilot Team...');
    await emailService.send({
      tenantId: targetTenantId,
      recipientType: 'CUSTOMER' as any,
      emailType: 'STAFF_INVITED',
      referenceId: 'test-' + (Date.now() + 3),
      module: 'GYM',
      to: targetEmail,
      subject: 'GymPilot Test: Team Sender',
      data: { inviterName: 'Admin' },
    });

    console.log('✅ All test emails triggered. check your inbox!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    await app.close();
  }
}

testEmails();
