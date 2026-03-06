import { PrismaClient } from '@prisma/client';
import { RazorpayService } from './src/core/billing/REMOVED_PAYMENT_INFRA.service';

// Mock/Instance setup since we are running as script
const prisma = new PrismaClient();
const rzp = new RazorpayService();

async function main() {
  const link = await rzp.createPaymentLink(
    100, // 1 Rupee
    'INR',
    'Test Payment Link',
    { name: 'Senthil', email: 'test@example.com', contact: '9123456789' },
    'TEST_REF_123'
  );

  console.log('Test Payment Link Created:');
  console.log(link.short_url);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
