import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AutoRenewCronService } from './src/core/billing/auto-renew.cron';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cronService = app.get(AutoRenewCronService);

  console.log('🚀 Triggering Auto-Renew Cron manually...');
  await cronService.autoRenewSubscriptions();
  console.log('✅ Cron execution finished.');

  await app.close();
}

bootstrap().catch(err => {
  console.error('❌ Failed to trigger cron:', err);
  process.exit(1);
});
