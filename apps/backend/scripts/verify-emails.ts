import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/common/email/email.service';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { ModuleType } from '@prisma/client';

async function bootstrap() {
  console.log('🚀 Starting Email Service Verification...\n');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);
  const prisma = app.get(PrismaService);

  // Get a real tenant to bypass FK constraints
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error('❌ No tenant found in database. Please create one first.');
    await app.close();
    return;
  }
  const tenantId = tenant.id;
  console.log(`✅ Using Tenant ID: ${tenantId}`);

  const testEmail = process.argv[2] || 'test@example.com';
  console.log(`📧 Test emails will be sent to: ${testEmail}\n`);

  const testCases = [
    {
      type: 'TENANT_WELCOME',
      module: ModuleType.GYM,
      subject: 'Welcome to GymPilot!',
      data: { tenantName: 'Elite Gym', link: 'https://mobibix.in/dashboard' }
    },
    {
      type: 'TENANT_WELCOME',
      module: ModuleType.MOBILE_SHOP,
      subject: 'Welcome to MobiBix!',
      data: { tenantName: 'Senthil Mobiles', link: 'https://mobibix.com/dashboard' }
    },
    {
      type: 'TRIAL_EXPIRING',
      module: ModuleType.MOBILE_SHOP,
      subject: 'MobiBix Trial Expiring Soon',
      data: { name: 'John Doe', trialEndDate: '2026-02-20', upgradeLink: 'https://mobibix.com/billing' }
    },
    {
      type: 'PAYMENT_FAILED',
      module: ModuleType.GYM,
      subject: 'Action Required: Payment Failed',
      data: { tenantName: 'Elite Fitness', planName: 'Pro Plan', retryCount: 1, payLink: 'https://mobibix.in/pay' }
    },
    {
      type: 'INVOICE_GENERATED',
      module: ModuleType.MOBILE_SHOP,
      subject: 'Your MobiBix Invoice',
      data: { 
        customerName: 'Alice Smith', 
        invoiceNumber: 'INV-2026-001', 
        amount: '₹1,500', 
        storeName: 'Alice Repairs', 
        invoiceDate: '2026-02-17', 
        viewLink: 'https://mobibix.com/inv/1' 
      }
    }
  ];

  for (const test of testCases) {
    console.log(`📤 Sending ${test.type} (${test.module})...`);
    try {
      await emailService.send({
        tenantId,
        recipientType: test.type.startsWith('TENANT') ? 'TENANT' : 'CUSTOMER',
        emailType: test.type as any,
        referenceId: `verify-${Date.now()}`,
        module: test.module,
        to: testEmail,
        subject: test.subject,
        data: test.data
      });
      console.log(`✅ Success!\n`);
    } catch (err: any) {
      // Logic for domain verification error explanation
      if (err.message.includes('domain is not verified')) {
        console.warn(`⚠️  NOTICE: ${err.message}`);
        console.warn(`    Rendering worked, but Resend blocked sending because sender domain is not verified.`);
        console.warn(`    To fix: Verify your domain in Resend dashboard or use onboarding@resend.dev for testing.`);
      } else {
        console.error(`❌ Failed: ${err.message}\n`);
      }
    }
  }

  console.log('✨ Verification Complete.');
  await app.close();
}

bootstrap().catch(err => {
  console.error('💥 Fatal Error:', err);
  process.exit(1);
});
