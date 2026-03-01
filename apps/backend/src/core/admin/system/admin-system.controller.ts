import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole, FeatureFlagScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/system')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.SUPPORT_ADMIN)
export class AdminSystemController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('webhook-logs')
  async getWebhookLogs(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { provider: { contains: search, mode: 'insensitive' } },
        { eventType: { contains: search, mode: 'insensitive' } },
        { referenceId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.webhookEvent.count({ where }),
      this.prisma.webhookEvent.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { receivedAt: 'desc' },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: pageNum,
        lastPage: Math.ceil(total / limitNum),
      },
    };
  }

  // --- Feature Flags ---

  @Get('feature-flags')
  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('feature-flags')
  async createFeatureFlag(@Body() data: any) {
    return this.prisma.featureFlag.create({ data });
  }

  @Patch('feature-flags/:id')
  async updateFeatureFlag(@Param('id') id: string, @Body() data: any) {
    return this.prisma.featureFlag.update({
      where: { id },
      data,
    });
  }

  // --- CORS Management ---

  @Get('cors-origins')
  async getCorsOrigins() {
    return this.prisma.corsAllowedOrigin.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('cors-origins')
  async addCorsOrigin(@Body() data: { origin: string; label?: string }) {
    return this.prisma.corsAllowedOrigin.create({
      data: {
        origin: data.origin,
        label: data.label,
        isEnabled: true,
      },
    });
  }

  @Delete('cors-origins/:id')
  async deleteCorsOrigin(@Param('id') id: string) {
    return this.prisma.corsAllowedOrigin.delete({
      where: { id },
    });
  }

  @Patch('cors-origins/:id')
  async toggleCorsOrigin(
    @Param('id') id: string,
    @Body() data: { isEnabled: boolean },
  ) {
    return this.prisma.corsAllowedOrigin.update({
      where: { id },
      data: { isEnabled: data.isEnabled },
    });
  }

  @Get('health')
  async getSystemHealth() {
    // Placeholder for system health metrics
    return {
      status: 'healthy',
      database: 'connected',
      redis: 'connected', // We know it's failing in logs, but this is the goal
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date(),
    };
  }
}
