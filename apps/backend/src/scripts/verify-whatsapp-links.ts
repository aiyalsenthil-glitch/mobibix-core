import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { WhatsAppVariableResolver } from '../modules/whatsapp/variable-resolver.service';
import { WhatsAppModule } from '../modules/whatsapp/variable-registry';

async function verify() {
  const prisma = new PrismaClient();
  // Instantiate the service with the raw Prisma client
  const resolver = new WhatsAppVariableResolver(prisma as any);

  try {
    console.log('🚀 Starting WhatsApp Link Resolution Verification...\n');

    // 1. Fetch a real Invoice
    const invoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (invoice) {
      console.log(`✅ Found Invoice: ${invoice.invoiceNumber} (${invoice.id})`);
      const context = {
        module: WhatsAppModule.MOBILE_SHOP,
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        shopId: invoice.shopId,
        eventType: 'INVOICE_CREATED',
      };

      const result = await resolver.resolveVariables(
        ['invoiceLink', 'invoice_link'],
        context,
      );
      console.log('--- Invoice Link Resolution ---');
      console.log('invoiceLink:', result.get('invoiceLink')?.value);
      console.log('invoice_link:', result.get('invoice_link')?.value);
      console.log('');
    } else {
      console.log('⚠️ No invoices found in database.');
    }

    // 2. Fetch a real JobCard
    const jobCard = await prisma.jobCard.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (jobCard) {
      console.log(`✅ Found JobCard: ${jobCard.jobNumber} (${jobCard.id})`);
      const context = {
        module: WhatsAppModule.MOBILE_SHOP,
        tenantId: jobCard.tenantId,
        jobCardId: jobCard.id,
        shopId: jobCard.shopId,
        eventType: 'JOB_READY',
      };

      const result = await resolver.resolveVariables(
        ['jobTrackingLink', 'job_tracking_link'],
        context,
      );
      console.log('--- Job Tracking Link Resolution ---');
      console.log('jobTrackingLink:', result.get('jobTrackingLink')?.value);
      console.log('job_tracking_link:', result.get('job_tracking_link')?.value);
      console.log('');
    } else {
      console.log('⚠️ No job cards found in database.');
    }

    console.log('🏁 Verification Complete.');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
