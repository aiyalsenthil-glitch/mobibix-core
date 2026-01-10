import { Injectable } from '@nestjs/common';
import { MembersService } from '../../../core/members/members.service';
import { GymAttendanceService } from '../attendance/gym-attendance.service';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class GymDashboardService {
  constructor(
    private readonly membersService: MembersService,
    private readonly attendanceService: GymAttendanceService,
    private readonly prisma: PrismaService,
  ) {}

  async getOwnerDashboard(tenantId: string) {
    const totalMembers = await this.membersService.countAll(tenantId);

    const todayAttendance =
      await this.attendanceService.countTodayAttendance(tenantId);

    const membershipsDue =
      await this.membersService.countMembershipsDue(tenantId);

    const expiringThisWeek = await this.membersService.countExpiringThisWeek(
      tenantId,
      7,
    );

    const pending = await this.membersService.getPaymentsPending(tenantId);

    // 🔴 FIX: calculate real due amount (supports partial payments)
    const expectedAmount = pending.reduce((sum, m) => {
      const due = (m.feeAmount ?? 0) - (m.paidAmount ?? 0);
      return due > 0 ? sum + due : sum;
    }, 0);
    // 📊 Monthly Revenue (from MemberPayment)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setMilliseconds(-1);

    const monthlyRevenueAgg = await this.prisma.memberPayment.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const monthlyRevenue = monthlyRevenueAgg._sum.amount ?? 0;

    return {
      totalMembers,
      todayAttendance,
      membershipsDue,
      paymentsPending: pending.length,
      expectedAmount,
      expiringThisWeek,
      monthlyRevenue,
    };
  }

  async getExpectedRenewals(tenantId: string, days: number) {
    // IST offset = +5:30
    const IST_OFFSET_MINUTES = 330;

    const now = new Date();

    // Convert "now" to IST
    const nowIST = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

    let fromIST: Date;
    let toIST: Date;

    if (days === 0) {
      // Renewals today (IST)
      fromIST = startOfDay(nowIST);
      toIST = endOfDay(nowIST);
    } else {
      fromIST = startOfDay(nowIST);
      toIST = endOfDay(addDays(nowIST, days));
    }

    // Convert IST boundaries back to UTC for DB
    const fromUTC = new Date(
      fromIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000,
    );
    const toUTC = new Date(toIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
    const members = await this.membersService.findExpiringBetween(
      tenantId,
      fromUTC,
      toUTC,
    );

    let expectedAmount = 0;

    for (const m of members) {
      if (m.paymentStatus === 'DUE' || m.paymentStatus === 'PARTIAL') {
        expectedAmount += m.feeAmount;
      }
    }

    return {
      count: members.length,
      expectedAmount,
    };
  }
}
