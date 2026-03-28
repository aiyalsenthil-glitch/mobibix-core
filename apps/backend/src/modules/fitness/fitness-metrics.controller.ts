import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { FitnessJwtGuard } from './guards/fitness-jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

const FREE_METRIC_LIMIT = 5;

class LogMetricDto {
  weightKg?: number;
  heightCm?: number;
  bodyFatPct?: number;
  waistCm?: number;
  hipCm?: number;
  armCm?: number;
  chestCm?: number;
  note?: string;
  date?: string; // ISO string, defaults to now
}

function calcBmi(weight?: number | null, height?: number | null): number | null {
  if (!weight || !height || height <= 0) return null;
  return Math.round((weight / Math.pow(height / 100, 2)) * 10) / 10;
}

@Controller('fitness/metrics')
@Public()
@SkipSubscriptionCheck()
@UseGuards(FitnessJwtGuard)
export class FitnessMetricsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Req() req: any) {
    const { fitnessProfileId } = req.user;
    return this.prisma.fitnessBodyMetric.findMany({
      where: { profileId: fitnessProfileId },
      orderBy: { date: 'desc' },
    });
  }

  @Get('latest')
  async latest(@Req() req: any) {
    const { fitnessProfileId } = req.user;
    return this.prisma.fitnessBodyMetric.findFirst({
      where: { profileId: fitnessProfileId },
      orderBy: { date: 'desc' },
    });
  }

  @Post()
  async log(@Req() req: any, @Body() dto: LogMetricDto) {
    const { fitnessProfileId } = req.user;

    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { id: fitnessProfileId },
      select: { tier: true, proExpiresAt: true },
    });

    const isPro =
      profile?.tier === 'PRO' &&
      (profile.proExpiresAt === null || profile.proExpiresAt > new Date());

    if (!isPro) {
      const count = await this.prisma.fitnessBodyMetric.count({
        where: { profileId: fitnessProfileId },
      });
      if (count >= FREE_METRIC_LIMIT) {
        throw new ForbiddenException(
          `Free plan allows up to ${FREE_METRIC_LIMIT} metric entries. Upgrade to Pro for unlimited tracking.`,
        );
      }
    }

    // Get latest height if not provided (carry forward)
    let heightCm = dto.heightCm ?? null;
    if (!heightCm) {
      const last = await this.prisma.fitnessBodyMetric.findFirst({
        where: { profileId: fitnessProfileId, heightCm: { not: null } },
        orderBy: { date: 'desc' },
        select: { heightCm: true },
      });
      heightCm = last?.heightCm ?? null;
    }

    const bmi = calcBmi(dto.weightKg, heightCm ?? dto.heightCm);

    return this.prisma.fitnessBodyMetric.create({
      data: {
        id: `fbm_${Date.now().toString(36)}`,
        profileId: fitnessProfileId,
        date: dto.date ? new Date(dto.date) : new Date(),
        weightKg: dto.weightKg ?? null,
        heightCm: dto.heightCm ?? null,
        bodyFatPct: dto.bodyFatPct ?? null,
        bmi,
        waistCm: dto.waistCm ?? null,
        hipCm: dto.hipCm ?? null,
        armCm: dto.armCm ?? null,
        chestCm: dto.chestCm ?? null,
        note: dto.note ?? null,
      },
    });
  }
}
