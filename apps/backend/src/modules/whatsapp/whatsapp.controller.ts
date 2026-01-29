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
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { WhatsAppSender } from './whatsapp.sender';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WhatsAppSender) private readonly sender: WhatsAppSender,
  ) {}

  /**
   * GET /whatsapp/logs/:tenantId
   * Get WhatsApp logs for a tenant
   */
  @Get('logs/:tenantId')
  async getLogs(@Param('tenantId') tenantId: string, @Req() req: any) {
    this.validateAccess(req, tenantId);

    const logs = await this.prisma.whatsAppLog.findMany({
      where: { tenantId },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });

    return logs;
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
   * Get WhatsApp templates for a module (GYM, MOBILESHOP)
   */
  @Get('templates/:moduleType')
  async getTemplates(@Param('moduleType') moduleType: string) {
    const templates = await this.prisma.whatsAppTemplate.findMany({
      where: { moduleType },
      orderBy: { updatedAt: 'desc' },
    });

    return templates;
  }

  /**
   * POST /whatsapp/templates
   * Create a WhatsApp template
   */
  @Post('templates')
  async createTemplate(
    @Body()
    dto: {
      moduleType: string;
      templateKey: string;
      metaTemplateName: string;
      category: string;
      feature: string;
      language?: string;
      status?: string;
    },
  ) {
    return this.prisma.whatsAppTemplate.create({
      data: {
        moduleType: dto.moduleType,
        templateKey: dto.templateKey,
        metaTemplateName: dto.metaTemplateName,
        category: dto.category,
        feature: dto.feature,
        language: dto.language || 'en',
        status: dto.status || 'ACTIVE',
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
    @Body() dto: any,
  ) {
    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    return this.prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: {
        templateKey: dto.templateKey || template.templateKey,
        metaTemplateName: dto.metaTemplateName || template.metaTemplateName,
        category: dto.category || template.category,
        feature: dto.feature || template.feature,
        language: dto.language || template.language,
        status: dto.status || template.status,
      },
    });
  }

  /**
   * DELETE /whatsapp/templates/:templateId
   * Delete a WhatsApp template
   */
  @Delete('templates/:templateId')
  async deleteTemplate(@Param('templateId') templateId: string) {
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
   * Get WhatsApp automations for a module (GYM, MOBILESHOP)
   */
  @Get('automations/:moduleType')
  async getAutomations(@Param('moduleType') moduleType: string) {
    const automations = await this.prisma.whatsAppAutomation.findMany({
      where: { moduleType },
      orderBy: { createdAt: 'desc' },
    });

    return automations;
  }

  /**
   * PATCH /whatsapp/automations/:automationId
   * Update a WhatsApp automation
   */
  @Patch('automations/:automationId')
  async updateAutomation(
    @Param('automationId') automationId: string,
    @Body() dto: any,
  ) {
    const automation = await this.prisma.whatsAppAutomation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      throw new BadRequestException('Automation not found');
    }

    return this.prisma.whatsAppAutomation.update({
      where: { id: automationId },
      data: {
        triggerType: dto.triggerType || automation.triggerType,
        templateKey: dto.templateKey || automation.templateKey,
        offsetDays: dto.offsetDays ?? automation.offsetDays,
        enabled: dto.enabled !== undefined ? dto.enabled : automation.enabled,
      },
    });
  }

  /**
   * POST /whatsapp/send
   * Send a WhatsApp message via template
   */
  @Post('send')
  async sendMessage(
    @Body()
    dto: {
      tenantId: string;
      phone: string;
      templateId: string;
      parameters?: string[];
    },
    @Req() req: any,
  ) {
    this.validateAccess(req, dto.tenantId);

    if (!dto.phone || !dto.templateId) {
      throw new BadRequestException('Missing phone or templateId');
    }

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
    );

    if (result.success && result.messageId) {
      // Update log with messageId
      await this.prisma.whatsAppLog.update({
        where: { id: log.id },
        data: {
          messageId: result.messageId,
          status: 'SENT',
        },
      });
    } else if (!result.success && result.error) {
      // Update log with error
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

  /**
   * Helper: Validate tenant access
   */
  private validateAccess(req: any, tenantId: string) {
    if (req.user?.role !== 'admin' && req.user?.tenantId !== tenantId) {
      throw new BadRequestException('Unauthorized');
    }
  }
}
