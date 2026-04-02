import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { WhatsAppBotService, BotMode } from './whatsapp-bot.service';

@Controller('whatsapp/bot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class WhatsAppBotController {
  constructor(private readonly botService: WhatsAppBotService) {}

  /** GET /whatsapp/bot/config */
  @Get('config')
  getConfig(@Req() req: any) {
    return this.botService.getBotConfig(req.user.tenantId);
  }

  /** PATCH /whatsapp/bot/config */
  @Patch('config')
  updateConfig(@Req() req: any, @Body() dto: any) {
    return this.botService.upsertBotConfig(req.user.tenantId, dto);
  }

  /**
   * POST /whatsapp/bot/preset
   * Body: { mode: 'REPAIR' | 'SALES' | 'MIXED' }
   * Clears existing keyword rules and seeds preset rules for the chosen mode.
   */
  @Post('preset')
  applyPreset(@Req() req: any, @Body() body: { mode: Exclude<BotMode, 'OFF'> }) {
    return this.botService.applyPreset(req.user.tenantId, body.mode);
  }

  /** GET /whatsapp/bot/rules */
  @Get('rules')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  listRules(@Req() req: any) {
    return this.botService.listRules(req.user.tenantId);
  }

  /** POST /whatsapp/bot/rules */
  @Post('rules')
  createRule(@Req() req: any, @Body() body: { keyword: string; replyText: string; exactMatch?: boolean; sortOrder?: number }) {
    return this.botService.createRule(req.user.tenantId, body);
  }

  /** PATCH /whatsapp/bot/rules/:id */
  @Patch('rules/:id')
  updateRule(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.botService.updateRule(req.user.tenantId, id, dto);
  }

  /** DELETE /whatsapp/bot/rules/:id */
  @Delete('rules/:id')
  deleteRule(@Req() req: any, @Param('id') id: string) {
    return this.botService.deleteRule(req.user.tenantId, id);
  }
}
