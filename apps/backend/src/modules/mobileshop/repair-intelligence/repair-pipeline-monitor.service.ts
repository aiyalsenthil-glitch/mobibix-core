import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { JobStatus } from '@prisma/client';

@Injectable()
export class RepairPipelineMonitorService {
  constructor(private prisma: PrismaService) {}

  /**
   * 🚨 Feature 5: Bottleneck Detection
   * Identifies jobs stuck in a specific status for too long.
   */
  async getBottlenecks(tenantId: string, shopId?: string) {
    const now = new Date();
    const diagnosingThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
    const inProgressThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours

    const stuckJobs = await this.prisma.jobCard.findMany({
      where: {
        tenantId,
        ...(shopId ? { shopId } : {}),
        deletedAt: null,
        OR: [
          { status: JobStatus.DIAGNOSING, updatedAt: { lt: diagnosingThreshold } },
          { status: JobStatus.IN_PROGRESS, updatedAt: { lt: inProgressThreshold } },
        ],
      },
      select: {
        id: true,
        jobNumber: true,
        deviceModel: true,
        status: true,
        updatedAt: true,
        assignedTo: { select: { fullName: true } },
      },
    });

    return stuckJobs.map((job) => ({
      jobId: job.id,
      jobNumber: job.jobNumber,
      device: job.deviceModel,
      status: job.status,
      hoursInStatus: Math.floor((now.getTime() - job.updatedAt.getTime()) / (1000 * 60 * 60)),
      technician: job.assignedTo?.fullName || 'Unassigned',
    }));
  }

  /**
   * 🔔 Feature 6: Smart Reminder Alerts
   * Detects customer-side delays (Ready for pickup, Waiting approval).
   */
  async getCustomerDelayAlerts(tenantId: string, shopId?: string) {
    const now = new Date();
    const readyThreshold = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours
    const approvalThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours

    const delayedJobs = await this.prisma.jobCard.findMany({
      where: {
        tenantId,
        ...(shopId ? { shopId } : {}),
        deletedAt: null,
        OR: [
          { status: JobStatus.READY, updatedAt: { lt: readyThreshold } },
          { status: JobStatus.WAITING_APPROVAL, updatedAt: { lt: approvalThreshold } },
        ],
      },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        customerPhone: true,
        status: true,
        updatedAt: true,
      },
    });

    return delayedJobs.map((job) => ({
      jobId: job.id,
      jobNumber: job.jobNumber,
      customerName: job.customerName,
      status: job.status,
      alert: job.status === JobStatus.READY 
        ? 'Customer has not collected device' 
        : 'Awaiting customer response for quote',
      daysDelayed: Math.floor((now.getTime() - job.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  }
}
