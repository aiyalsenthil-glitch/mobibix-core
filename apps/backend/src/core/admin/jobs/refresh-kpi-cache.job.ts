import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminCacheService } from '../cache/admin-cache.service';

@Processor('admin-jobs')
export class RefreshKpiCacheJob extends WorkerHost {
  private readonly logger = new Logger(RefreshKpiCacheJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminCache: AdminCacheService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const startTime = performance.now();
    this.logger.log(`Start refreshing KPI cached data... (Job: ${job.id})`);

    try {
      await this.prisma
        .$executeRaw`REFRESH MATERIALIZED VIEW admin_global_kpis;`;
      await this.prisma
        .$executeRaw`REFRESH MATERIALIZED VIEW admin_revenue_monthly;`;

      await this.adminCache.invalidate('admin:global:kpis');
      await this.adminCache.invalidatePattern('admin:revenue:*');

      const durationMs = Math.round(performance.now() - startTime);
      this.logger.log(
        `✅ Refreshed KPI views and cache successfully in ${durationMs}ms`,
      );
    } catch (error: any) {
      // 42P01 = relation does not exist — views not yet initialized, skip silently
      if ((error as any)?.code === 'P2010' && error.message?.includes('42P01')) {
        this.logger.warn(
          'KPI materialized views not found — skipping refresh. Run the view-init SQL to create them.',
        );
        return;
      }
      this.logger.error(
        `Failed to refresh KPI materialized views: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
