import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppPlansController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /whatsapp/plans
   * List all plans (for WhatsApp Master UI)
   */
  @Get('plans')
  async getPlans(@Req() req: any) {
    // Only admin or super_admin can access
    if (req.user?.role !== 'admin' && req.user?.role !== 'SUPER_ADMIN') {
      return [];
    }
    return this.prisma.plan.findMany({
      orderBy: { level: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        price: true,
        durationDays: true,
      },
    });
  }
}
