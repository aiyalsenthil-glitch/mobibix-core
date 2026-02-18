import { Injectable } from '@nestjs/common';
import { MembersService } from '../../../core/members/members.service';
import { GymAttendanceService } from '../attendance/gym-attendance.service';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { PrismaService } from '../../../core/prisma/prisma.service';

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

    const startOfNextMonth = new Date(startOfMonth);
    startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setMilliseconds(-1);
    const monthlyRevenueAgg = await this.prisma.memberPayment.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
        status: {
          in: ['PAID', 'PARTIAL'], // ✅ CRITICAL FIX
        },
      },
      _sum: {
        amount: true,
      },
    });

    const monthlyRevenue = monthlyRevenueAgg._sum.amount ?? 0;

    // ---------------------------------------------------------
    // 📊 TRENDS (Phase 3)
    // ---------------------------------------------------------
    const lastMonthStart = new Date(startOfMonth);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(startOfMonth);

    const lastMonthRevenueAgg = await this.prisma.memberPayment.aggregate({
      where: {
        tenantId,
        createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
        status: { in: ['PAID', 'PARTIAL'] },
      },
      _sum: { amount: true },
    });
    const lastMonthRevenue = lastMonthRevenueAgg._sum.amount ?? 0;

    // ---------------------------------------------------------
    // 📱 WHATSAPP RECOVERY (Phase 2)
    // ---------------------------------------------------------
    // Correlation: Payment made within 48h of a WhatsApp reminder
    const thisMonthPayments = await this.prisma.memberPayment.findMany({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth, lt: startOfNextMonth },
        status: { in: ['PAID', 'PARTIAL'] },
      },
      select: { amount: true, memberId: true, createdAt: true },
    });

    // Fetch all WhatsApp logs for this month once
    const whatsappLogs = await this.prisma.whatsAppLog.findMany({
      where: {
        tenantId,
        sentAt: { gte: new Date(startOfMonth.getTime() - 48 * 60 * 60 * 1000), lt: startOfNextMonth },
      },
      select: { memberId: true, sentAt: true },
    });

    let whatsappRecoveryAmount = 0;
    for (const payment of thisMonthPayments) {
      if (!payment.memberId) continue;
      
      const windowStart = new Date(payment.createdAt.getTime() - 48 * 60 * 60 * 1000);
      const reminder = whatsappLogs.find(log => 
        log.memberId === payment.memberId && 
        log.sentAt >= windowStart && 
        log.sentAt <= payment.createdAt
      );

      if (reminder) {
        whatsappRecoveryAmount += payment.amount;
      }
    }

    // ---------------------------------------------------------
    // 📊 VALUE SNAPSHOT METRICS (Phase 1)
    // ---------------------------------------------------------

    // 💳 COLLECTION EFFICIENCY (Paid vs Expected this month)
    const expectedRevenueAgg = await this.prisma.member.aggregate({
      where: {
        tenantId,
        paymentStatus: { in: ['DUE', 'PARTIAL'] },
        membershipEndAt: { gte: startOfMonth, lt: startOfNextMonth },
      },
      _sum: { feeAmount: true },
    });
    const expectedThisMonth = expectedRevenueAgg?._sum?.feeAmount ?? 0;
    const totalExpected = expectedThisMonth + monthlyRevenue;
    const collectionEfficiency = totalExpected > 0 
      ? Math.round((monthlyRevenue / totalExpected) * 100) 
      : 100;

    // 📱 WHATSAPP STATS
    const [whatsappSent, whatsappDelivered] = await Promise.all([
      this.prisma.whatsAppLog.count({
        where: { tenantId, sentAt: { gte: startOfMonth, lt: startOfNextMonth } },
      }),
      this.prisma.whatsAppLog.count({
        where: { 
          tenantId, 
          sentAt: { gte: startOfMonth, lt: startOfNextMonth },
          status: 'DELIVERED' 
        },
      }),
    ]);

    // 🏋️ ATTENDANCE TREND (This Month Avg vs Last Month Avg)
    const [thisMonthCheckins, lastMonthCheckins] = await Promise.all([
      this.prisma.gymAttendance.count({
        where: { tenantId, createdAt: { gte: startOfMonth, lt: startOfNextMonth } }
      }),
      this.prisma.gymAttendance.count({
        where: { tenantId, createdAt: { gte: lastMonthStart, lt: startOfMonth } }
      })
    ]);

    const daysInMonth = new Date().getDate(); 
    const daysInLastMonth = 30; // Approximation

    const attendanceAvg = Math.round(thisMonthCheckins / (daysInMonth || 1));
    const lastMonthAttendanceAvg = Math.round(lastMonthCheckins / daysInLastMonth);

    return {
      totalMembers,
      todayAttendance,
      membershipsDue,
      paymentsPending: pending.length,
      pendingAmount: expectedAmount,
      expectedAmount,
      expiringThisWeek,
      monthlyRevenue,
      lastMonthRevenue, // Phase 3
      whatsappRecoveryAmount, // Phase 2
      // Value Snapshot Result
      collectionEfficiency,
      whatsappStats: {
        sent: whatsappSent,
        delivered: whatsappDelivered,
      },
      attendanceAvg,
      lastMonthAttendanceAvg,
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
