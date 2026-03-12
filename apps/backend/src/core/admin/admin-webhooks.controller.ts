import { Controller, Get, UseGuards, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';

@Controller('admin/webhooks')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.ADMIN)
export class AdminWebhooksController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get()
  async listWebhookEvents() {
    return this.prisma.webhookEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get(':id')
  async getWebhookEvent(@Param('id') id: string) {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }
}
