import {
  Controller, Get, Patch, Body, Param, Req, UseGuards, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsAppOpsController {
  constructor(private readonly prisma: PrismaService) {}

  // ── Notification Source ───────────────────────────────────────────────────

  @Get('settings/notification-source')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getNotificationSource(@Req() req: any) {
    const config = await this.prisma.whatsAppBotConfig.findUnique({
      where: { tenantId: req.user.tenantId },
      select: { notificationSource: true },
    });
    const ownNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId: req.user.tenantId, provider: 'META_CLOUD', isEnabled: true },
      select: { id: true, displayNumber: true, phoneNumberId: true },
    });
    return {
      notificationSource: config?.notificationSource ?? 'PLATFORM',
      hasOwnNumber: !!ownNumber,
      ownNumber: ownNumber ?? null,
    };
  }

  @Patch('settings/notification-source')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async setNotificationSource(
    @Req() req: any,
    @Body() body: { notificationSource: 'PLATFORM' | 'OWN_NUMBER' },
  ) {
    return this.prisma.whatsAppBotConfig.upsert({
      where: { tenantId: req.user.tenantId },
      create: { tenantId: req.user.tenantId, notificationSource: body.notificationSource },
      update: { notificationSource: body.notificationSource },
      select: { notificationSource: true },
    });
  }

  // ── CAPI Settings ─────────────────────────────────────────────────────────

  @Get('settings/capi')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getCapiSettings(@Req() req: any) {
    const number = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId: req.user.tenantId, provider: 'META_CLOUD', isEnabled: true },
      select: { id: true, displayNumber: true, capiDatasetId: true, capiAccessToken: true },
    });
    if (!number) return { configured: false };
    return {
      configured: !!(number.capiDatasetId && number.capiAccessToken),
      numberId: number.id,
      displayNumber: number.displayNumber,
      capiDatasetId: number.capiDatasetId ?? null,
      // Never return raw token — just presence
      hasCapiToken: !!number.capiAccessToken,
    };
  }

  @Patch('settings/capi')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async saveCapiSettings(
    @Req() req: any,
    @Body() body: { capiDatasetId: string; capiAccessToken?: string },
  ) {
    const number = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId: req.user.tenantId, provider: 'META_CLOUD', isEnabled: true },
      select: { id: true },
    });
    if (!number) return { success: false, error: 'No connected Meta number found' };

    const data: any = { capiDatasetId: body.capiDatasetId };
    if (body.capiAccessToken?.trim()) data.capiAccessToken = body.capiAccessToken.trim();

    await this.prisma.whatsAppNumber.update({ where: { id: number.id }, data });
    return { success: true };
  }

  // ── Inbox: Unread Count ───────────────────────────────────────────────────

  @Get('inbox/unread-count')
  async getUnreadCount(@Req() req: any) {
    const { tenantId } = req.user;

    // Get all conversations and their lastReadAt
    const states = await this.prisma.whatsAppConversationState.findMany({
      where: { tenantId },
      select: { phoneNumber: true, lastReadAt: true },
    });

    if (states.length === 0) return { total: 0, conversations: [] };

    // For each conversation, count INCOMING messages since lastReadAt
    const counts = await Promise.all(
      states.map(async (s) => {
        const count = await this.prisma.whatsAppMessageLog.count({
          where: {
            tenantId,
            phoneNumber: s.phoneNumber,
            direction: 'INCOMING',
            provider: 'META_CLOUD',
            ...(s.lastReadAt ? { createdAt: { gt: s.lastReadAt } } : {}),
          },
        });
        return { phoneNumber: s.phoneNumber, unread: count };
      }),
    );

    const total = counts.reduce((sum, c) => sum + c.unread, 0);
    return { total, conversations: counts.filter(c => c.unread > 0) };
  }

  @Patch('inbox/mark-read/:phone')
  async markConversationRead(@Req() req: any, @Param('phone') phone: string) {
    await this.prisma.whatsAppConversationState.updateMany({
      where: { tenantId: req.user.tenantId, phoneNumber: phone },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }

  // ── Conversation Assignment ───────────────────────────────────────────────

  @Patch('inbox/assign/:phone')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  async assignConversation(
    @Req() req: any,
    @Param('phone') phone: string,
    @Body() body: { userId: string | null },
  ) {
    await this.prisma.whatsAppConversationState.updateMany({
      where: { tenantId: req.user.tenantId, phoneNumber: phone },
      data: { assignedToUserId: body.userId },
    });
    return { success: true };
  }

  @Get('inbox/conversations')
  async getConversationMeta(@Req() req: any, @Query('phone') phone?: string) {
    const where: any = { tenantId: req.user.tenantId };
    if (phone) where.phoneNumber = phone;

    const states = await this.prisma.whatsAppConversationState.findMany({
      where,
      select: {
        phoneNumber: true,
        assignedToUserId: true,
        lastReadAt: true,
        botPaused: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });
    return states;
  }

  // ── Bot Analytics ─────────────────────────────────────────────────────────

  @Get('analytics/bot')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getBotAnalytics(@Req() req: any, @Query('days') days = '7') {
    const { tenantId } = req.user;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    const [totalInbound, botHandled, agentHandled, uniqueConversations] = await Promise.all([
      // Total inbound messages
      this.prisma.whatsAppMessageLog.count({
        where: { tenantId, direction: 'INCOMING', provider: 'META_CLOUD', createdAt: { gte: since } },
      }),
      // Bot-handled (outgoing with source=bot)
      this.prisma.whatsAppMessageLog.count({
        where: {
          tenantId, direction: 'OUTGOING', provider: 'META_CLOUD', createdAt: { gte: since },
          metadata: { path: ['source'], equals: 'bot' },
        },
      }),
      // Agent-handled (outgoing with source=agent)
      this.prisma.whatsAppMessageLog.count({
        where: {
          tenantId, direction: 'OUTGOING', provider: 'META_CLOUD', createdAt: { gte: since },
          metadata: { path: ['source'], equals: 'agent' },
        },
      }),
      // Unique conversations (unique phoneNumbers in inbound)
      this.prisma.whatsAppMessageLog.groupBy({
        by: ['phoneNumber'],
        where: { tenantId, direction: 'INCOMING', provider: 'META_CLOUD', createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    // Top keywords triggered
    const topKeywords = await this.prisma.$queryRaw<{ keyword: string; count: bigint }[]>`
      SELECT
        (metadata->>'keyword') as keyword,
        COUNT(*) as count
      FROM "WhatsAppMessageLog"
      WHERE "tenantId" = ${tenantId}
        AND direction = 'OUTGOING'
        AND provider = 'META_CLOUD'
        AND "createdAt" >= ${since}
        AND metadata->>'source' = 'bot'
        AND metadata->>'keyword' IS NOT NULL
      GROUP BY metadata->>'keyword'
      ORDER BY count DESC
      LIMIT 5
    `;

    const botRate = totalInbound > 0 ? Math.round((botHandled / totalInbound) * 100) : 0;

    return {
      period: `${days}d`,
      totalInbound,
      botHandled,
      agentHandled,
      botRate,
      uniqueConversations: uniqueConversations.length,
      topKeywords: topKeywords.map(k => ({ keyword: k.keyword, count: Number(k.count) })),
    };
  }
}
