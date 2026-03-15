import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AdminJobsCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminJobsCronService.name);

  constructor(@InjectQueue('admin-jobs') private readonly adminQueue: Queue) {}

  async onApplicationBootstrap() {
    this.logger.log('Registering repeating admin jobs...');
    // Clear old repeatable jobs if needed, but BullMQ handles it usually if config is exactly same
    await this.adminQueue.add(
      'refresh-kpis-cron',
      {},
      {
        repeat: {
          pattern: CronExpression.EVERY_5_MINUTES,
        },
      },
    );
  }

  @OnEvent('payment.webhook.success')
  async handlePaymentSuccessEvent(payload: any) {
    this.logger.log(
      `Payment success event received. Queueing immediate KPI refresh.`,
    );
    await this.adminQueue.add('refresh-kpis-immediate', {
      triggeredBy: 'webhook',
    });
  }
}
