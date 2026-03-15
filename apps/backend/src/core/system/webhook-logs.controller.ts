import { Controller, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, WebhookStatus, ModuleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { PERMISSIONS } from '../../security/permission-registry';

@ApiTags('Admin - System')
@Controller('admin/system/webhooks')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
@ApiBearerAuth()
export class WebhookLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('failed')
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List failed webhooks' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFailedWebhooks(@Query('limit') limit = 50) {
    return this.prisma.webhookEvent.findMany({
      where: {
        status: WebhookStatus.FAILED,
      },
      orderBy: {
        receivedAt: 'desc',
      },
      take: Number(limit),
    });
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get webhook details' })
  async getWebhookDetails(@Param('id') id: string) {
    return this.prisma.webhookEvent.findUnique({
      where: { id },
    });
  }
}
