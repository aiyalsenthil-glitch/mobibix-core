import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';
import { ModuleType, UserRole } from '@prisma/client';

import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEnum(['TENANT', 'STAFF', 'CUSTOMER', 'ADMIN', 'LEAD'])
  @IsNotEmpty()
  recipientType: 'TENANT' | 'STAFF' | 'CUSTOMER' | 'ADMIN' | 'LEAD';

  @IsString()
  @IsOptional()
  senderPrefix?: string;
}

@Controller('email')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @RequirePermission(PERMISSIONS.CORE.EMAIL.VIEW)
  @Get('logs')
  async getEmailLogs(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    const { tenantId, role } = req.user;
    const isPlatformAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

    // Build the query: Platform admins can see all logs if not pinned to a specific tenant context.
    // Regular users are strictly limited to their own tenantId.
    const where = (isPlatformAdmin && !tenantId) ? {} : { tenantId };
    
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  @RequirePermission(PERMISSIONS.CORE.EMAIL.SEND)
  @Post('send')
  async sendCustomEmail(@Req() req: any, @Body() dto: SendEmailDto) {
    const tenantId = req.user.tenantId;
    const module = (req.headers['x-module-type'] as ModuleType) || ModuleType.CORE;

    await this.emailService.send({
      tenantId,
      recipientType: dto.recipientType,
      emailType: 'CUSTOM_EMAIL',
      referenceId: `manual-${Date.now()}`,
      module,
      senderPrefix: dto.senderPrefix,
      to: dto.to,
      subject: dto.subject,
      data: {
        subject: dto.subject,
        body: dto.body,
      },
    });

    return { success: true, message: 'Email sent successfully' };
  }

  @RequirePermission(PERMISSIONS.CORE.EMAIL.VIEW)
  @Get('inbound')
  async getInboundEmails(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    const { tenantId, role } = req.user;
    const isPlatformAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

    const where = (isPlatformAdmin && !tenantId) ? {} : { tenantId };
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      this.prisma.inboundEmail.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inboundEmail.count({ where }),
    ]);

    return {
      emails,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

