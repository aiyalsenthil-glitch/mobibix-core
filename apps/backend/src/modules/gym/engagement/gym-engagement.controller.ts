import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';
import { FitnessJwtGuard } from '../../fitness/guards/fitness-jwt.guard';
import { PrismaService } from '../../../core/prisma/prisma.service';

// Badge thresholds (days in current month)
const BADGE_THRESHOLDS = [
  { name: 'Platinum', emoji: '🏆', min: 25 },
  { name: 'Gold',     emoji: '🥇', min: 20 },
  { name: 'Silver',   emoji: '🥈', min: 15 },
  { name: 'Bronze',   emoji: '🥉', min: 10 },
];

function computeBadge(daysThisMonth: number) {
  return BADGE_THRESHOLDS.find(b => daysThisMonth >= b.min) ?? null;
}

function computeStreak(dates: Date[]): { current: number; longest: number } {
  if (!dates.length) return { current: 0, longest: 0 };

  // Deduplicate to day-level (YYYY-MM-DD) and sort descending
  const days = [...new Set(
    dates.map(d => d.toISOString().slice(0, 10)),
  )].sort().reverse();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Current streak — must include today or yesterday to be active
  let current = 0;
  if (days[0] === today || days[0] === yesterday) {
    let prev = days[0];
    for (const day of days) {
      const diff = (new Date(prev).getTime() - new Date(day).getTime()) / 86400000;
      if (diff <= 1) { current++; prev = day; }
      else break;
    }
  }

  // Longest streak — scan full history
  let longest = 0;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000;
    if (diff === 1) { run++; longest = Math.max(longest, run); }
    else run = 1;
  }
  longest = Math.max(longest, run, current);

  return { current, longest };
}

/**
 * Fitness-facing engagement data (streak + badge).
 * Protected by FitnessJwtGuard — member portal only.
 */
@Controller('fitness/engagement')
@Public()
@SkipSubscriptionCheck()
@UseGuards(FitnessJwtGuard)
export class GymEngagementController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /fitness/engagement/streak
   * Returns currentStreak, longestStreak, badge for the logged-in fitness user.
   */
  @Get('streak')
  async getStreak(@Req() req: any) {
    const { fitnessProfileId } = req.user;

    // Get all linked member IDs
    const members = await this.prisma.member.findMany({
      where: { fitnessProfileId, isActive: true },
      select: { id: true },
    });
    if (!members.length) return { currentStreak: 0, longestStreak: 0, badge: null, daysThisMonth: 0 };

    const memberIds = members.map(m => m.id);

    // All attendance dates
    const attendance = await this.prisma.gymAttendance.findMany({
      where: { memberId: { in: memberIds } },
      select: { checkInTime: true },
      orderBy: { checkInTime: 'desc' },
    });

    const dates = attendance.map(a => a.checkInTime);
    const { current, longest } = computeStreak(dates);

    // Days this calendar month
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const daysThisMonth = new Set(
      dates.filter(d => d >= monthStart).map(d => d.toISOString().slice(0, 10)),
    ).size;

    const badge = computeBadge(daysThisMonth);

    // Persist streak to profile (for quick reads elsewhere)
    await this.prisma.fitnessProfile.update({
      where: { id: fitnessProfileId },
      data: {
        currentStreak: current,
        longestStreak: Math.max(longest, current),
        lastStreakDate: dates[0] ?? null,
      },
    });

    return {
      currentStreak: current,
      longestStreak: Math.max(longest, current),
      daysThisMonth,
      badge,
      milestones: [7, 14, 30, 60, 90].filter(m => current >= m),
    };
  }
}
