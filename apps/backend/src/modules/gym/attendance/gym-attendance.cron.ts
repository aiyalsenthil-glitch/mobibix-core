import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ModuleType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AutomationService } from '../../whatsapp/automation.service';

@Injectable()
export class GymAttendanceCron implements OnModuleInit {
  private readonly logger = new Logger(GymAttendanceCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationService: AutomationService,
  ) {}

  onModuleInit() {}

  @Cron('0 0 * * *') // every day at 12:00 AM
  async autoCheckout() {
    await this.prisma.gymAttendance.updateMany({
      where: {
        checkOutTime: null,
      },
      data: {
        checkOutTime: new Date(),
      },
    });
  }

  /**
   * 💸 Payment Due: Fire PAYMENT_DUE for members with outstanding balance
   */
  @Cron('0 8 * * *') // every day at 8:00 AM
  async checkPaymentDue() {
    this.logger.log('Starting payment due check...');

    const dueMembers = await this.prisma.member.findMany({
      where: {
        isActive: true,
        paymentStatus: { in: ['DUE', 'PARTIAL'] },
      },
      select: { id: true, tenantId: true },
    });

    this.logger.log(`Found ${dueMembers.length} members with payment due.`);

    for (const member of dueMembers) {
      await this.automationService.handleEvent({
        moduleType: ModuleType.GYM,
        eventType: 'PAYMENT_DUE',
        tenantId: member.tenantId,
        entityId: member.id,
      });
    }
  }

  /**
   * 📅 Membership Expiry: Fire MEMBERSHIP_EXPIRY for memberships expiring in 3 days
   */
  @Cron('0 9 * * *') // every day at 9:00 AM
  async checkMembershipExpiry() {
    this.logger.log('Starting membership expiry check...');

    const today = new Date();
    const warningDate = new Date();
    warningDate.setDate(today.getDate() + 3);

    const expiringMemberships = await this.prisma.gymMembership.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: today, lte: warningDate },
      },
      select: { memberId: true, member: { select: { tenantId: true } } },
    });

    this.logger.log(
      `Found ${expiringMemberships.length} memberships expiring within 3 days.`,
    );

    for (const membership of expiringMemberships) {
      await this.automationService.handleEvent({
        moduleType: ModuleType.GYM,
        eventType: 'MEMBERSHIP_EXPIRY',
        tenantId: membership.member.tenantId,
        entityId: membership.memberId,
      });
    }
  }

  /**
   * 📉 Retention: Detect absence gaps (3 days)
   */
  @Cron('0 10 * * *') // every day at 10:00 AM
  async checkAttendanceGaps() {
    this.logger.log('Starting member attendance gap check...');

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 3);

    // Find active members who haven't checked in for at least 3 days
    const membersWithGaps = await this.prisma.member.findMany({
      where: {
        isActive: true,
        attendances: {
          none: {
            checkInTime: { gte: thresholdDate },
          },
        },
        // Only check members created more than 3 days ago to avoid welcome spam
        createdAt: { lt: thresholdDate },
      },
    });

    this.logger.log(
      `Found ${membersWithGaps.length} members with attendance gaps.`,
    );

    for (const member of membersWithGaps) {
      this.logger.debug(`Triggering ATTENDANCE_GAP for member: ${member.id}`);
      await this.automationService.handleEvent({
        moduleType: ModuleType.GYM,
        eventType: 'ATTENDANCE_GAP',
        tenantId: member.tenantId,
        entityId: member.id,
      });
    }
  }
}
