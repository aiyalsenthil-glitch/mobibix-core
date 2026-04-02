import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Inject,
  Query,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const MEDIA_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'whatsapp-media');
const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', mp4: 'video/mp4', '3gp': 'video/3gpp', ogg: 'audio/ogg',
  mp3: 'audio/mpeg', aac: 'audio/aac', m4a: 'audio/mp4', pdf: 'application/pdf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
import { PrismaService } from '../../core/prisma/prisma.service';
import { ModuleType, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Public } from '../../core/auth/decorators/public.decorator';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppUserService } from './whatsapp-user.service';
import { VirtualTenantGuard } from './guards/virtual-tenant.guard';
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { WhatsAppInboxService } from './inbox/whatsapp-inbox.service';
import { WhatsAppTokenService } from './whatsapp-token.service';

import {
  WhatsAppModule,
  getVariablesByContext,
  getVariablesByModule,
} from './variable-registry';

@Controller('whatsapp')
@ModulePermission('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF, UserRole.USER)
export class WhatsAppController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WhatsAppSender) private readonly sender: WhatsAppSender,
    private readonly userService: WhatsAppUserService,
    private readonly inboxService: WhatsAppInboxService,
    private readonly tokenService: WhatsAppTokenService,
  ) {}

  /**
   * GET /whatsapp/variables/:module/:templateKey
   * Get variables allowed for a specific template context
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.TEMPLATE_MANAGE)
  @Get('variables/:module/:templateKey')
  @UseGuards(VirtualTenantGuard)
  async getTemplateVariables(
    @Param('module') module: string,
    @Param('templateKey') templateKey: string,
    @Query('category') category?: string,
  ) {
    const whatsAppModule = module.toUpperCase() as WhatsAppModule;

    // Use getVariablesByContext to get template-specific and global variables
    let variables = getVariablesByContext(whatsAppModule, templateKey);

    // Hard Requirement: Remove customMessage for UTILITY templates
    if (category?.toUpperCase() === 'UTILITY') {
      variables = variables.filter((v) => v.key !== 'customMessage');
    }

    return variables.map((v) => ({
      key: v.key,
      label: v.label,
      required: v.required,
      dataType: v.dataType,
      module: v.module,
    }));
  }

  /**
   * GET /whatsapp/logs/:tenantId
   * Get WhatsApp logs for a tenant
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  @Get('logs/:tenantId')
  @UseGuards(VirtualTenantGuard)
  async getLogs(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // ✅ TENANT ISOLATION: Verify user has access to requested tenant
    // Admins can view "all" logs; staff only their own tenant
    this.validateAccess(req, tenantId);

    // Default to last 7 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date();

    if (!startDate) {
      start.setDate(end.getDate() - 7);
    }

    // Ensure start is at beginning of day, end at end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const isAll = tenantId.toLowerCase() === 'all';
    const tenantFilter = isAll ? {} : { tenantId };

    const [whatsAppLogs, reminders, followUps, alerts] = await Promise.all([
      // 1. Standard WhatsApp Logs
      this.prisma.whatsAppLog.findMany({
        where: {
          ...tenantFilter,
          sentAt: { gte: start, lte: end },
        },
        orderBy: { sentAt: 'desc' },
        take: 100,
      }),

      // 2. Customer Reminders
      this.prisma.customerReminder.findMany({
        where: {
          ...tenantFilter,
          scheduledAt: { gte: start, lte: end },
        },
        include: { customer: { select: { phone: true, name: true } } },
        orderBy: { scheduledAt: 'desc' },
        take: 100,
      }),

      // 3. Customer FollowUps
      this.prisma.customerFollowUp.findMany({
        where: {
          ...tenantFilter,
          createdAt: { gte: start, lte: end },
        },
        include: { customer: { select: { phone: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),

      // 4. Customer Alerts
      this.prisma.customerAlert.findMany({
        where: {
          ...tenantFilter,
          createdAt: { gte: start, lte: end },
        },
        include: { customer: { select: { phone: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Map all to a unified structure compatible with UI expecting WhatsAppLog-like fields
    const unifiedLogs = [
      ...whatsAppLogs.map((log) => ({
        ...log,
        category: 'WHATSAPP_LOG', // Tag source
        displayName: `WhatsApp: ${log.type}`,
      })),
      ...reminders.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        memberId: r.customerId, // Map customerId to memberId slot
        phone: r.customer.phone,
        type: r.triggerType, // e.g. PAYMENT_DUE
        status: r.status,
        error: r.failureReason,
        messageId: null,
        metadata: { templateKey: r.templateKey, customerName: r.customer.name },
        sentAt: r.sentAt || r.scheduledAt || r.createdAt, // Use best available time
        category: 'REMINDER',
        displayName: `Reminder: ${r.triggerType}`,
      })),
      ...followUps.map((f) => ({
        id: f.id,
        tenantId: f.tenantId,
        memberId: f.customerId,
        phone: f.customer.phone,
        type: f.type, // e.g. CALL/MEETING
        status: f.status,
        error: f.note, // Use note as "details/error" column
        messageId: null,
        metadata: { purpose: f.purpose, customerName: f.customer.name },
        sentAt: f.createdAt,
        category: 'FOLLOW_UP',
        displayName: `FollowUp: ${f.type}`,
      })),
      ...alerts.map((a) => ({
        id: a.id,
        tenantId: a.tenantId,
        memberId: a.customerId,
        phone: a.customer.phone,
        type: 'ALERT',
        status: a.severity, // HIGH/LOW etc
        error: a.message,
        messageId: null,
        metadata: { source: a.source, customerName: a.customer.name },
        sentAt: a.createdAt,
        category: 'ALERT',
        displayName: `Alert: ${a.source}`,
      })),
    ];

    // Sort combined list by date desc
    return unifiedLogs
      .sort((a, b) => {
        const timeA = new Date(a.sentAt || 0).getTime();
        const timeB = new Date(b.sentAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 200); // Return top 200 combined
  }

  /**
   * GET /whatsapp/media/:tenantId/:filename
   * Serve a locally-stored WhatsApp media file (auth-gated, tenant-scoped).
   */
  @Get('media/:tenantId/:filename')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  async serveMedia(
    @Param('tenantId') tenantId: string,
    @Param('filename') filename: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    this.validateAccess(req, tenantId);

    // Security: reject path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }

    const filePath = path.join(MEDIA_UPLOAD_DIR, tenantId, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Media file not found');
    }

    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.sendFile(filePath);
  }

  /**
   * DELETE /whatsapp/logs/:tenantId
   * Clear all message logs for a tenant (Inbox Reset)
   */
  @Delete('logs/:tenantId')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  async deleteLogs(@Param('tenantId') tenantId: string, @Req() req: any) {
    this.validateAccess(req, tenantId);
    
    await (this.prisma as any).whatsAppMessageLog.deleteMany({
      where: { tenantId }
    });

    return { success: true, message: 'Inbox cleared' };
  }
  @Get('status/:tenantId')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.VIEW_DASHBOARD)
  async getStatus(@Param('tenantId') tenantId: string) {
    const number = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, isDefault: true },
    });

    if (!number) return { status: 'DISCONNECTED', message: 'No number configured' };
    
    return {
      status: number.setupStatus,
      phoneNumber: number.phoneNumber,
    };
  }

  /**
   * GET /whatsapp/conversations/:tenantId
   */
  @Get('conversations/:tenantId')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  async getConversations(@Param('tenantId') tenantId: string, @Req() req: any) {
    this.validateAccess(req, tenantId);

    const logs = await (this.prisma as any).whatsAppMessageLog.findMany({
      where: {
        tenantId,
        provider: 'META_CLOUD',
        phoneNumber: { not: null },
      },
      distinct: ['phoneNumber'],
      orderBy: { phoneNumber: 'asc' },
      take: 100,
    });

    const results = await Promise.all(logs.map(async (log) => {
        const lastMsg = await (this.prisma as any).whatsAppMessageLog.findFirst({
            where: { tenantId, phoneNumber: log.phoneNumber },
            orderBy: { createdAt: 'desc' }
        });
        
        return {
            phoneNumber: log.phoneNumber,
            pushName: (lastMsg?.metadata as any)?.pushName || null,
            lastMessage: lastMsg?.body || '',
            lastTimestamp: lastMsg?.createdAt || new Date(),
            unreadCount: 0
        };
    }));

    return results.sort((a, b) => 
      new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
  }

  @Post('sync/:tenantId/:phoneNumber')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  async syncConversation(
    @Param('tenantId') tenantId: string,
    @Param('phoneNumber') phoneNumber: string,
    @Req() req: any
  ) {
    this.validateAccess(req, tenantId);
    await this.inboxService.requestSync(tenantId, phoneNumber);
    return { status: 'SYNC_REQUESTED' };
  }

  /**
   * GET /whatsapp/messages/:tenantId/:phoneNumber
   */
  @Get('messages/:tenantId/:phoneNumber')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  async getMessages(
    @Param('tenantId') tenantId: string,
    @Param('phoneNumber') phoneNumber: string,
    @Req() req: any
  ) {
    this.validateAccess(req, tenantId);

    return (this.prisma as any).whatsAppMessageLog.findMany({
      where: { tenantId, phoneNumber, provider: 'META_CLOUD' },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
  }

  /**
   * POST /whatsapp/logs/:logId/retry
   * Retry sending a WhatsApp message
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  @Post('logs/:logId/retry')
  async retryLog(@Param('logId') logId: string, @Req() req: any) {
    const log = await this.prisma.whatsAppLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new BadRequestException('Log not found');
    }

    this.validateAccess(req, log.tenantId);

    // Update log status to PENDING for retry
    return this.prisma.whatsAppLog.update({
      where: { id: logId },
      data: { status: 'PENDING' },
    });
  }

  /**
   * GET /whatsapp/templates/:moduleType
   * Get WhatsApp templates for a module (GYM, MOBILE_SHOP)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.TEMPLATE_MANAGE)
  @Get('templates/:moduleType')
  @UseGuards(VirtualTenantGuard)
  async getTemplates(@Param('moduleType') moduleType: string) {
    const templates = await this.prisma.whatsAppTemplate.findMany({
      where: { moduleType },
      orderBy: { updatedAt: 'desc' },
    });

    return templates || [];
  }

  /**
   * POST /whatsapp/templates
   * Create a WhatsApp template
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.TEMPLATE_MANAGE)
  @Post('templates')
  async createTemplate(
    @Req() req: any,
    @Body()
    dto: {
      moduleType: string;
      templateKey: string;
      metaTemplateName: string;
      category: string;
      feature: string;
      language?: string;
      status?: string;
      variables?: string[];
    },
  ) {
    this.validateAdminAccess(req);
    return this.prisma.whatsAppTemplate.create({
      data: {
        moduleType: dto.moduleType,
        templateKey: dto.templateKey,
        metaTemplateName: dto.metaTemplateName,
        category: dto.category,
        feature: dto.feature,
        language: dto.language || 'en',
        status: dto.status || 'ACTIVE',
        variables: dto.variables ?? undefined,
      },
    });
  }

  /**
   * PATCH /whatsapp/templates/:templateId
   * Update a WhatsApp template
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.TEMPLATE_MANAGE)
  @Patch('templates/:templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Req() req: any,
    @Body() dto: any,
  ) {
    this.validateAdminAccess(req);
    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    try {
      return await this.prisma.whatsAppTemplate.update({
        where: { id: templateId },
        data: {
          templateKey: dto.templateKey ?? template.templateKey,
          metaTemplateName: dto.metaTemplateName ?? template.metaTemplateName,
          category: dto.category ?? template.category,
          feature: dto.feature ?? template.feature,
          language: dto.language ?? template.language,
          status: dto.status ?? template.status,
          variables: dto.variables ?? template.variables ?? undefined,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const fields = error.meta?.target || ['moduleType', 'metaTemplateName'];
        throw new ConflictException(
          `Unique constraint failed: A template with this ${fields} already exists for this module.`,
        );
      }
      throw error;
    }
  }

  /**
   * DELETE /whatsapp/templates/:templateId
   * Delete a WhatsApp template
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.TEMPLATE_MANAGE)
  @Delete('templates/:templateId')
  async deleteTemplate(
    @Param('templateId') templateId: string,
    @Req() req: any,
  ) {
    this.validateAdminAccess(req);
    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    return this.prisma.whatsAppTemplate.delete({
      where: { id: templateId },
    });
  }

  /**
   * GET /whatsapp/automations/:moduleType
   * Get WhatsApp automations for a module (GYM, MOBILE_SHOP)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Get('automations/:moduleType')
  @UseGuards(VirtualTenantGuard)
  async getAutomations(@Param('moduleType') moduleType: string) {
    // Map legacy/mobile UI value to correct enum
    let prismaModuleType: ModuleType;
    if (moduleType === 'MOBILE_SHOP') prismaModuleType = ModuleType.MOBILE_SHOP;
    else if (moduleType === 'GYM') prismaModuleType = ModuleType.GYM;
    else throw new BadRequestException('Invalid moduleType');
    const automations = await this.prisma.whatsAppAutomation.findMany({
      where: { moduleType: prismaModuleType },
      orderBy: { createdAt: 'desc' },
    });
    return automations;
  }

  /**
   * POST /whatsapp/automations
   * Create a WhatsApp automation
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Post('automations')
  async createAutomation(
    @Req() req: any,
    @Body()
    dto: {
      moduleType: string;
      triggerType: string;
      templateKey: string;
      offsetDays: number;
      enabled?: boolean;
    },
  ) {
    this.validateAdminAccess(req);
    const { moduleType, triggerType, templateKey, offsetDays, enabled } = dto;

    if (!moduleType || !triggerType || !templateKey) {
      throw new BadRequestException(
        'moduleType, triggerType, templateKey required',
      );
    }

    if (offsetDays === undefined || Number.isNaN(Number(offsetDays))) {
      throw new BadRequestException('offsetDays must be a number');
    }

    const allowedModules = ['GYM', 'MOBILE_SHOP'];
    const allowedTriggers = [
      'DATE',
      'AFTER_INVOICE',
      'AFTER_JOB',
      'JOB_CREATED',
      'JOB_READY',
      'JOB_COMPLETED',
      'INVOICE_CREATED',
      'PAYMENT_PENDING',
      'FOLLOW_UP_SCHEDULED',
      'FOLLOW_UP_OVERDUE',
      'FOLLOW_UP_COMPLETED',
      'PAYMENT_DUE',
      'MEMBER_CREATED',
      'TRAINER_ASSIGNED',
      'COACHING_FOLLOWUP',
      'MEMBERSHIP_EXPIRY',
      'MEMBERSHIP_EXPIRY_BEFORE',
      'MEMBERSHIP_EXPIRY_AFTER',
      'PAYMENT_DUE_BEFORE',
      'PAYMENT_DUE_AFTER',
    ];

    if (!allowedModules.includes(moduleType)) {
      throw new BadRequestException('Invalid moduleType');
    }

    if (!allowedTriggers.includes(triggerType)) {
      throw new BadRequestException('Invalid triggerType');
    }

    const prismaModuleType =
      moduleType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : moduleType;

    const normalizedOffsetDays = (() => {
      const parsed = Number(offsetDays);
      if (
        ['MEMBERSHIP_EXPIRY_AFTER', 'PAYMENT_DUE_AFTER'].includes(triggerType)
      ) {
        return -Math.abs(parsed);
      }
      if (
        ['MEMBERSHIP_EXPIRY_BEFORE', 'PAYMENT_DUE_BEFORE'].includes(triggerType)
      ) {
        return Math.abs(parsed);
      }
      return parsed;
    })();

    // Check for existing automation by UNIQUE Key (Module + Event)
    const existing = await this.prisma.whatsAppAutomation.findFirst({
      where: {
        moduleType: prismaModuleType as any,
        eventType: triggerType,
      },
    });

    if (existing) {
      // Update existing automation
      return this.prisma.whatsAppAutomation.update({
        where: { id: existing.id },
        data: {
          templateKey,
          offsetDays: normalizedOffsetDays,
          enabled: enabled !== undefined ? enabled : true,
        },
      });
    }

    // Create new automation
    return this.prisma.whatsAppAutomation.create({
      data: {
        moduleType: prismaModuleType as any,
        eventType: triggerType,
        templateKey,
        offsetDays: normalizedOffsetDays,
        enabled: enabled !== undefined ? enabled : true,
      },
    });
  }

  /**
   * PATCH /whatsapp/automations/:automationId
   * Update a WhatsApp automation
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Patch('automations/:automationId')
  async updateAutomation(
    @Param('automationId') automationId: string,
    @Req() req: any,
    @Body() dto: any,
  ) {
    this.validateAdminAccess(req);
    const automation = await this.prisma.whatsAppAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      throw new BadRequestException('Automation not found');
    }

    return this.prisma.whatsAppAutomation.update({
      where: { id: automationId },
      data: {
        eventType: dto.triggerType || automation.eventType,
        templateKey: dto.templateKey || automation.templateKey,
        offsetDays: dto.offsetDays ?? automation.offsetDays,
        enabled: dto.enabled !== undefined ? dto.enabled : automation.enabled,
      },
    });
  }

  /**
   * POST /whatsapp/send
   * Send a WhatsApp message (Template OR Text)
   */
  @Post('send')
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  async sendMessage(
    @Body()
    dto: {
      tenantId?: string;
      phone?: string;
      templateId?: string;
      templateName?: string;
      text?: string;
      parameters?: string[];
    },
    @Req() req: any,
  ) {
    // Fallback to JWT tenantId when client omits it (e.g. Android app)
    const tenantId: string = dto.tenantId || req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId is required');
    this.validateAccess(req, tenantId);

    // Normalize parameters if frontend uses different names
    const phone = dto.phone || (dto as any).phoneNumber;
    const text = dto.text || (dto as any).body;

    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    // Resolve templateId from templateName when only name is provided (Android app)
    let resolvedTemplateId = dto.templateId;
    if (!resolvedTemplateId && dto.templateName) {
      const tmpl = await this.prisma.whatsAppTemplate.findFirst({
        where: { metaTemplateName: dto.templateName },
        select: { id: true },
      });
      resolvedTemplateId = tmpl?.id;
    }

    if (!resolvedTemplateId && !text) {
      throw new BadRequestException(
        'Either templateId/templateName or text must be provided',
      );
    }

    // Validate phone format - loosened for Group JIDs, LIDs, and standard phones
    // Allows digits, @, ., -, and alphabets (for LIDs)
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^[a-zA-Z0-9@.\-]+$/.test(cleanPhone) && cleanPhone !== 'status') {
      throw new BadRequestException(
        'Invalid phone format. Must be a valid phone number or WhatsApp JID.',
      );
    }

    // ---------------------------------------------------------
    // A. FREE TEXT FLOW (Manual Reply / Staff)
    // ---------------------------------------------------------
    if (text) {
      const textBody = text.trim();
      if (!textBody) return { success: true, skipped: true }; // Empty text check

      // Get default WhatsAppNumber for tenant
      let defaultNumber = await this.prisma.whatsAppNumber.findFirst({
        where: { tenantId, isDefault: true, isEnabled: true },
        select: { id: true },
      });

      // Fallback: If no default marked, take the first available enabled number
      if (!defaultNumber) {
        defaultNumber = await this.prisma.whatsAppNumber.findFirst({
          where: { tenantId, isEnabled: true },
          select: { id: true },
        });
      }

      if (!defaultNumber) {
        throw new BadRequestException(
          'No active WhatsApp configuration found for this tenant. Please connect your number first.',
        );
      }

      // sendTextMessage owns WhatsAppLog creation internally — no duplicate here
      const result = await this.sender.sendTextMessage(
        tenantId,
        phone,
        textBody,
      );

      if (result.success && result.messageId) {
        // Write to WhatsAppMessageLog for inbox conversation thread
        await (this.prisma as any).whatsAppMessageLog.create({
          data: {
            tenantId,
            phoneNumber: phone,
            direction: 'OUTGOING',
            body: textBody,
            status: 'SENT',
            provider: 'META_CLOUD',
            whatsAppNumberId: defaultNumber.id,
            metadata: { messageId: result.messageId },
          },
        });
      }

      return { success: result.success, error: result.error ?? undefined };
    }

    // ---------------------------------------------------------
    // B. TEMPLATE FLOW (Automation / Notifications)
    // ---------------------------------------------------------
    if (resolvedTemplateId) {
      const template = await this.prisma.whatsAppTemplate.findUnique({
        where: { id: resolvedTemplateId },
      });

      if (!template) {
        throw new BadRequestException('Template not found');
      }

      // Get default WhatsAppNumber for tenant
      let defaultNumber = await this.prisma.whatsAppNumber.findFirst({
        where: { tenantId, isDefault: true, isEnabled: true },
        select: { id: true },
      });

      // Fallback: If no default marked, take the first available enabled number
      if (!defaultNumber) {
        defaultNumber = await this.prisma.whatsAppNumber.findFirst({
          where: { tenantId, isEnabled: true },
          select: { id: true },
        });
      }

      if (!defaultNumber) {
        throw new BadRequestException(
          'No active WhatsApp configuration found for this tenant. Please connect your number first.',
        );
      }

      // Create log entry with PENDING status first
      const log = await this.prisma.whatsAppLog.create({
        data: {
          tenantId,
          whatsAppNumberId: defaultNumber.id,
          phone: phone,
          type: template.feature,
          status: 'PENDING',
          metadata: dto.parameters ? { parameters: dto.parameters } : undefined,
        },
      });

      // Send the message
      const result = await this.sender.sendTemplateMessage(
        tenantId,
        template.feature as any,
        phone,
        template.metaTemplateName,
        dto.parameters || [],
        { logId: log.id }, // Pass logId to helper for auto update
      );

      // Note: sendTemplateMessage already updates the log if logId is passed.
      // But we return the fresh log.
      return this.prisma.whatsAppLog.findFirst({
        where: { id: log.id, tenantId },
      });
    }
  }

  /**
   * Helper: Validate tenant access
   */
  private validateAccess(req: any, tenantId: string) {
    // Development Bypass for standalone tools
    if (process.env.NODE_ENV !== 'production' && !req.user) {
      return;
    }

    // Admin can access everything, including "all"
    const userRole = req.user?.role as string;
    if (
      userRole &&
      (userRole.toUpperCase() === 'ADMIN' ||
        userRole.toUpperCase() === 'SUPER_ADMIN')
    ) {
      return;
    }
    // Specific tenant access check
    if (tenantId.toLowerCase() === 'all') {
      throw new BadRequestException('Unauthorized to view all logs');
    }

    if (req.user.tenantId !== tenantId) {
      throw new BadRequestException('Unauthorized');
    }
  }

  /**
   * Helper: Validate admin-only access
   */
  private validateAdminAccess(req: any) {
    const userRole = req.user?.role as string;
    if (
      !userRole ||
      (userRole.toUpperCase() !== 'ADMIN' &&
        userRole.toUpperCase() !== 'SUPER_ADMIN')
    ) {
      throw new BadRequestException('Unauthorized - Admin access required');
    }
  }

  /**
   * GET /whatsapp/summary
   * Get WhatsApp usage summary for the current tenant
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  @Get('summary')
  async getUsageSummary(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID required');
    }
    return this.userService.getUsageSummary(tenantId);
  }

  /**
   * GET /whatsapp/meta-templates
   * List message templates from Meta WhatsApp Business API (whatsapp_business_management)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  @Get('meta-templates')
  async listMetaTemplates(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    const number = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, isDefault: true, provider: 'META_CLOUD' as any },
    });
    if (!number) throw new BadRequestException('No Meta Cloud number configured');
    const token = await this.tokenService.resolveToken(number as any);
    if (!token) throw new BadRequestException('No access token');
    const axios = (await import('axios')).default;
    const resp = await axios.get(
      `https://graph.facebook.com/v19.0/${(number as any).wabaId}/message_templates`,
      {
        params: { fields: 'id,name,status,category,language,components', limit: 20 },
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return resp.data;
  }

  /**
   * POST /whatsapp/meta-templates
   * Create a message template via Meta WhatsApp Business API (whatsapp_business_management)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.SEND)
  @Post('meta-templates')
  async createMetaTemplate(@Req() req: any, @Body() dto: any) {
    const tenantId = req.user?.tenantId;
    const number = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, isDefault: true, provider: 'META_CLOUD' as any },
    });
    if (!number) throw new BadRequestException('No Meta Cloud number configured');
    const token = await this.tokenService.resolveToken(number as any);
    if (!token) throw new BadRequestException('No access token');
    const axios = (await import('axios')).default;
    const resp = await axios.post(
      `https://graph.facebook.com/v19.0/${(number as any).wabaId}/message_templates`,
      dto,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );
    return resp.data;
  }
}
