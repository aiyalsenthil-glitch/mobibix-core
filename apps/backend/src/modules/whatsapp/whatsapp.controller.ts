import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ConflictException,
  BadRequestException,
  Inject,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ModuleType, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppUserService } from './whatsapp-user.service';

import {
  WhatsAppModule,
  getVariablesByContext,
  getVariablesByModule,
} from './variable-registry';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class WhatsAppController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WhatsAppSender) private readonly sender: WhatsAppSender,
    private readonly userService: WhatsAppUserService,
  ) {}

  /**
   * GET /whatsapp/variables/:module/:templateKey
   * Get variables allowed for a specific template context
   */
  @Get('variables/:module/:templateKey')
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
  @Get('logs/:tenantId')
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
   * POST /whatsapp/logs/:logId/retry
   * Retry sending a WhatsApp message
   */
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
  @Get('templates/:moduleType')
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
  @Get('automations/:moduleType')
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
  async sendMessage(
    @Body()
    dto: {
      tenantId: string;
      phone: string;
      templateId?: string;
      text?: string;
      parameters?: string[];
    },
    @Req() req: any,
  ) {
    this.validateAccess(req, dto.tenantId);

    if (!dto.phone) {
      throw new BadRequestException('Phone number is required');
    }

    if (!dto.templateId && !dto.text) {
      throw new BadRequestException(
        'Either templateId or text must be provided',
      );
    }

    // Validate phone format (accept: +919876543210 or 919876543210)
    const cleanPhone = dto.phone.replace(/\s/g, '');
    if (!/^(\+91|91)?[0-9]{10,15}$/.test(cleanPhone)) {
      throw new BadRequestException(
        'Invalid phone format. Use +91XXXXXXXXXX or 91XXXXXXXXXX (10 digit number required)',
      );
    }

    // ---------------------------------------------------------
    // A. FREE TEXT FLOW (Manual Reply / Staff)
    // ---------------------------------------------------------
    if (dto.text) {
      const textBody = dto.text.trim();
      if (!textBody) return { success: true, skipped: true }; // Empty text check

      // Create log entry
      const log = await this.prisma.whatsAppLog.create({
        data: {
          tenantId: dto.tenantId,
          phone: dto.phone,
          type: 'MANUAL',
          status: 'PENDING',
          metadata: { text_snippet: textBody.substring(0, 50) },
        },
      });

      // Send Text
      const result = await this.sender.sendTextMessage(
        dto.tenantId,
        dto.phone,
        textBody,
      );

      // Update Log
      if (result.success && result.messageId) {
        await this.prisma.whatsAppLog.update({
          where: { id: log.id },
          data: { messageId: result.messageId, status: 'SENT' },
        });
      } else {
        await this.prisma.whatsAppLog.update({
          where: { id: log.id },
          data: {
            status: 'FAILED',
            error:
              typeof result.error === 'string'
                ? result.error
                : JSON.stringify(result.error),
          },
        });
      }
      return this.prisma.whatsAppLog.findUnique({ where: { id: log.id } });
    }

    // ---------------------------------------------------------
    // B. TEMPLATE FLOW (Automation / Notifications)
    // ---------------------------------------------------------
    if (dto.templateId) {
      const template = await this.prisma.whatsAppTemplate.findUnique({
        where: { id: dto.templateId },
      });

      if (!template) {
        throw new BadRequestException('Template not found');
      }

      // Create log entry with PENDING status first
      const log = await this.prisma.whatsAppLog.create({
        data: {
          tenantId: dto.tenantId,
          phone: dto.phone,
          type: template.feature,
          status: 'PENDING',
          metadata: dto.parameters ? { parameters: dto.parameters } : undefined,
        },
      });

      // Send the message
      const result = await this.sender.sendTemplateMessage(
        dto.tenantId,
        template.feature as any,
        dto.phone,
        template.metaTemplateName,
        dto.parameters || [],
        { logId: log.id }, // Pass logId to helper for auto update
      );

      // Note: sendTemplateMessage already updates the log if logId is passed.
      // But we return the fresh log.
      return this.prisma.whatsAppLog.findUnique({ where: { id: log.id } });
    }
  }

  /**
   * Helper: Validate tenant access
   */
  private validateAccess(req: any, tenantId: string) {
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

    if (req.user?.tenantId !== tenantId) {
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
  @Get('summary')
  async getUsageSummary(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID required');
    }
    return this.userService.getUsageSummary(tenantId);
  }
}
