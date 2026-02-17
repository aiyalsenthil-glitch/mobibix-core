
import { PrismaClient, WebhookStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 Starting Webhook Observability Verification...');

  const prisma = new PrismaClient();

  try {
    // 1. Verify Enum Existence
    console.log('🔍 Checking WebhookStatus Enum...');
    if (!WebhookStatus) {
        throw new Error('❌ WebhookStatus Enum is undefined!');
    }
    console.log('✅ WebhookStatus Enum exists:', WebhookStatus);

    // 2. Create a Mock Failed Webhook
    console.log('📝 Creating dummy FAILED webhook event...');
    const event = await prisma.webhookEvent.create({
      data: {
        provider: 'TEST_PROVIDER',
        eventType: 'test.event',
        payload: { valid: false },
        status: WebhookStatus.FAILED,
        error: 'Verification Test Error',
        retryCount: 1,
        processedAt: new Date(),
      },
    });

    console.log(`✅ Created WebhookEvent: ${event.id} with status ${event.status}`);

    // 3. Verify Retrieval (Simulating Admin Query)
    console.log('🔍 Querying failed webhooks...');
    const failedEvents = await prisma.webhookEvent.findMany({
        where: { status: WebhookStatus.FAILED },
        take: 1
    });

    if (failedEvents.length > 0 && failedEvents[0].id === event.id) {
        console.log('✅ Successfully retrieved failed webhook from DB.');
    } else {
        console.warn('⚠️ Could not retrieve the just created webhook (might be buried if many exist).');
    }

    // Cleanup
    await prisma.webhookEvent.delete({ where: { id: event.id } });
    console.log('🧹 Cleanup complete.');

  } catch (err) {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
