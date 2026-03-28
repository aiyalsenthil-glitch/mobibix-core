import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { FitnessJwtGuard } from './guards/fitness-jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

@Controller('fitness/me')
@Public()
@SkipSubscriptionCheck()
@UseGuards(FitnessJwtGuard)
export class FitnessProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getProfile(@Req() req: any) {
    const { fitnessProfileId } = req.user;
    return this.prisma.fitnessProfile.findUnique({
      where: { id: fitnessProfileId },
      select: { id: true, email: true, fullName: true, phone: true, goalType: true, createdAt: true },
    });
  }

  @Patch()
  async updateProfile(@Req() req: any, @Body() body: { fullName?: string; phone?: string; goalType?: string }) {
    const { fitnessProfileId } = req.user;
    const { fullName, phone, goalType } = body;
    return this.prisma.fitnessProfile.update({
      where: { id: fitnessProfileId },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(goalType !== undefined && { goalType: goalType as any }),
      },
      select: { id: true, email: true, fullName: true, phone: true, goalType: true },
    });
  }
}
