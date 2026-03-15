import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * WarrantyService: Track warranty expiry and send alerts
 *
 * Purpose: Manage job warranty lifecycle
 * Features: Expiry calculation, alert triggers, warranty status checks
 */
@Injectable()
export class WarrantyService {
  private readonly logger = new Logger(WarrantyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate warranty expiry date from job completion date
   * @param completionDate - Date when job was marked DELIVERED
   * @param warrantyDuration - Duration in days
   */
  calculateWarrantyExpiry(
    completionDate: Date,
    warrantyDuration: number,
  ): Date {
    const expiryDate = new Date(completionDate);
    expiryDate.setDate(expiryDate.getDate() + warrantyDuration);
    return expiryDate;
  }

  /**
   * Check warranty status for a job
   * Returns: ACTIVE, EXPIRING_SOON (<7 days), EXPIRED
   */
  getWarrantyStatus(
    completionDate: Date,
    warrantyDuration: number,
  ): {
    status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
    expiryDate: Date;
    daysRemaining: number;
  } {
    const expiryDate = this.calculateWarrantyExpiry(
      completionDate,
      warrantyDuration,
    );
    const today = new Date();
    const daysRemaining = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
    if (daysRemaining < 0) {
      status = 'EXPIRED';
    } else if (daysRemaining <= 7) {
      status = 'EXPIRING_SOON';
    } else {
      status = 'ACTIVE';
    }

    return { status, expiryDate, daysRemaining };
  }

  /**
   * Get jobs with expiring warranties (next N days)
   * Used for sending reminder notifications to customers
   */
  async getExpiringWarranties(
    tenantId: string,
    shopId?: string,
    daysAhead: number = 7,
  ): Promise<
    Array<{
      jobId: string;
      jobNumber: string;
      customerName: string;
      customerPhone: string;
      completedAt: Date;
      warrantyDuration: number;
      expiryDate: Date;
      daysRemaining: number;
    }>
  > {
    // Get all delivered jobs with warranty
    const jobs = await this.prisma.jobCard.findMany({
      where: {
        tenantId,
        ...(shopId && { shopId }),
        status: 'DELIVERED',
        warrantyDuration: { gt: 0 },
      },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        customerPhone: true,
        updatedAt: true, // Approximation of delivery date
        warrantyDuration: true,
      },
    });

    const today = new Date();
    const expiringJobs: Array<{
      jobId: string;
      jobNumber: string;
      customerName: string;
      customerPhone: string;
      completedAt: Date;
      warrantyDuration: number;
      expiryDate: Date;
      daysRemaining: number;
    }> = [];

    for (const job of jobs) {
      const expiryDate = this.calculateWarrantyExpiry(
        job.updatedAt,
        job.warrantyDuration!,
      );
      const daysRemaining = Math.floor(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Include if expiring within daysAhead and not yet expired
      if (daysRemaining >= 0 && daysRemaining <= daysAhead) {
        expiringJobs.push({
          jobId: job.id,
          jobNumber: job.jobNumber,
          customerName: job.customerName,
          customerPhone: job.customerPhone,
          completedAt: job.updatedAt,
          warrantyDuration: job.warrantyDuration!,
          expiryDate,
          daysRemaining,
        });
      }
    }

    this.logger.log(
      `Found ${expiringJobs.length} warranties expiring in next ${daysAhead} days`,
    );

    return expiringJobs.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Get all active warranties (not expired)
   * Used for dashboard widget
   */
  async getActiveWarranties(
    tenantId: string,
    shopId?: string,
  ): Promise<
    Array<{
      jobId: string;
      jobNumber: string;
      customerName: string;
      warrantyType: string;
      expiryDate: Date;
      daysRemaining: number;
      status: string;
    }>
  > {
    const jobs = await this.prisma.jobCard.findMany({
      where: {
        tenantId,
        ...(shopId && { shopId }),
        status: 'DELIVERED',
        warrantyDuration: { gt: 0 },
      },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        updatedAt: true,
        warrantyDuration: true,
        warrantyType: true,
      },
    });

    const today = new Date();
    const activeWarranties: Array<{
      jobId: string;
      jobNumber: string;
      customerName: string;
      warrantyType: string;
      expiryDate: Date;
      daysRemaining: number;
      status: string;
    }> = [];

    for (const job of jobs) {
      const expiryDate = this.calculateWarrantyExpiry(
        job.updatedAt,
        job.warrantyDuration!,
      );
      const daysRemaining = Math.floor(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Only include if not expired
      if (daysRemaining >= 0) {
        const warrantyStatus = this.getWarrantyStatus(
          job.updatedAt,
          job.warrantyDuration!,
        );

        activeWarranties.push({
          jobId: job.id,
          jobNumber: job.jobNumber,
          customerName: job.customerName,
          warrantyType: job.warrantyType || 'BOTH',
          expiryDate,
          daysRemaining,
          status: warrantyStatus.status,
        });
      }
    }

    return activeWarranties.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Validate warranty claim before accepting repair
   * Throws error if warranty expired or type doesn't cover the issue
   */
  async validateWarrantyClaim(
    tenantId: string,
    jobId: string,
    claimType: 'PARTS' | 'LABOR' | 'BOTH',
  ): Promise<{
    valid: boolean;
    message: string;
  }> {
    const job = await this.prisma.jobCard.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (job.status !== 'DELIVERED') {
      return {
        valid: false,
        message: 'Cannot claim warranty on incomplete job',
      };
    }

    if (!job.warrantyDuration || job.warrantyDuration === 0) {
      return {
        valid: false,
        message: 'This job has no warranty coverage',
      };
    }

    const warrantyStatus = this.getWarrantyStatus(
      job.updatedAt,
      job.warrantyDuration,
    );

    if (warrantyStatus.status === 'EXPIRED') {
      return {
        valid: false,
        message: `Warranty expired on ${warrantyStatus.expiryDate.toDateString()}`,
      };
    }

    // Check warranty type coverage
    const jobWarrantyType = job.warrantyType || 'BOTH';
    if (jobWarrantyType === 'PARTS' && claimType === 'LABOR') {
      return {
        valid: false,
        message: 'Warranty only covers parts, not labor',
      };
    }

    if (jobWarrantyType === 'LABOR' && claimType === 'PARTS') {
      return {
        valid: false,
        message: 'Warranty only covers labor, not parts',
      };
    }

    return {
      valid: true,
      message: `Warranty valid. ${warrantyStatus.daysRemaining} days remaining.`,
    };
  }
}
