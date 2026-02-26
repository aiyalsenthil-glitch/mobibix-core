import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentExpiryCronService {
  private readonly logger = new Logger(PaymentExpiryCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run every hour
   * Finds pending payments that have expired and marks them as FAILED/EXPIRED
   * NOTE: Extracted from internal @Cron to a designated K8s CronJob
   */
  async expireStalePayments() {
    this.logger.log('🔄 Checking for expired pending payments...');

    try {
      const result = await this.prisma.payment.updateMany({
        where: {
          status: PaymentStatus.PENDING,
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: PaymentStatus.FAILED, // Expired
        },
      });

      if (result.count > 0) {
        this.logger.log(`✅ Marked ${result.count} stale payments as FAILED(Expired)`);
      } else {
        this.logger.log('✅ No stale payments found.');
      }
    } catch (err) {
      this.logger.error(
        `❌ Failed to process expired payments: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
