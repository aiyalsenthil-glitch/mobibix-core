import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AutoRenewCronService } from '../src/core/billing/auto-renew.cron';
import { PaymentExpiryCronService } from '../src/core/billing/payment-expiry.cron';

/**
 * Script used by Kubernetes CronJobs to trigger scheduled tasks.
 * Usage: npx ts-node scripts/run-crons.ts <jobName>
 * Example: npx ts-node scripts/run-crons.ts auto-renew
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  
  const args = process.argv.slice(2);
  const jobName = args[0];

  if (!jobName) {
    console.error('❌ Please specify a job name (e.g., auto-renew or payment-expiry)');
    process.exit(1);
  }

  try {
    switch (jobName) {
      case 'auto-renew':
        const autoRenewService = app.get(AutoRenewCronService);
        await autoRenewService.autoRenewSubscriptions();
        break;

      case 'payment-expiry':
        const paymentExpiryService = app.get(PaymentExpiryCronService);
        await paymentExpiryService.expireStalePayments();
        break;

      default:
        console.error(`❌ Unknown cron job: ${jobName}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error running cron ${jobName}:`, error);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
