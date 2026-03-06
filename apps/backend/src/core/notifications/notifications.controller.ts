import {
  Controller,
  Get,
  UseGuards,
  Req,
  Put,
  Param,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /notifications
   * Returns the latest 30 IN_APP notifications for the current user.
   * Includes isRead flag based on readAt field.
   */
  @Get()
  async getNotifications(@Req() req: any) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const notifications = await this.prisma.notificationLog.findMany({
      where: {
        tenantId,
        channel: 'IN_APP',
        OR: [
          { userId },
          { userId: null }, // Tenant-wide notifications
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        eventId: true,
        title: true,
        payload: true,
        status: true,
        readAt: true,
        createdAt: true,
        sentAt: true,
      },
    });

    return notifications.map((n) => ({
      ...n,
      isRead: n.readAt !== null,
    }));
  }

  /**
   * GET /notifications/unread-count
   * Returns how many unread notifications the user has (for bell badge).
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const count = await this.prisma.notificationLog.count({
      where: {
        tenantId,
        channel: 'IN_APP',
        readAt: null, // unread
        OR: [{ userId }, { userId: null }],
      },
    });

    return { count };
  }

  /**
   * PATCH /notifications/:id/read
   * Marks a single notification as read.
   */
  @Patch(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;

    await this.prisma.notificationLog.updateMany({
      where: {
        id,
        tenantId,
        channel: 'IN_APP',
        readAt: null, // Only update if not already read
      },
      data: {
        readAt: new Date(),
        status: 'DELIVERED',
      },
    });

    return { success: true };
  }

  /**
   * PATCH /notifications/read-all
   * Marks all unread notifications as read (bell dismiss all).
   */
  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const result = await this.prisma.notificationLog.updateMany({
      where: {
        tenantId,
        channel: 'IN_APP',
        readAt: null,
        OR: [{ userId }, { userId: null }],
      },
      data: {
        readAt: new Date(),
        status: 'DELIVERED',
      },
    });

    return { markedRead: result.count };
  }
}
