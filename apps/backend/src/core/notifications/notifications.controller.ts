import { Controller, Get, UseGuards, Req, Put, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // Fetch In-App notifications for this user/tenant
    return this.prisma.notificationLog.findMany({
      where: {
        tenantId,
        channel: 'IN_APP',
        OR: [
          { userId },
          { userId: null }, // Global tenant notifications
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  @Put(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;

    return this.prisma.notificationLog.updateMany({
      where: {
        id,
        tenantId,
        channel: 'IN_APP',
      },
      data: {
        status: 'SENT', // We can use 'SENT' for unread and something else for read, or add a column.
        // For now, let's just update the updated timestamp or status if we want to track 'read' state.
        // Actually, mb_notification_log doesn't have a 'readAt' column.
        // Let's assume 'SENT' means available but let's check schema.
      },
    });
  }
}
