import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionDispatcherService } from './action-dispatcher.service';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('permissions/approvals')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
export class ApprovalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionDispatcher: ActionDispatcherService,
  ) {}

  @RequirePermission(PERMISSIONS.CORE.APPROVAL.VIEW)
  @Roles(UserRole.OWNER)
  @Get('pending')
  async listPending(@Req() req: any, @Query('shopId') shopId?: string) {
    return this.prisma.approvalRequest.findMany({
      where: {
        tenantId: req.user.tenantId,
        status: 'PENDING',
        ...(shopId ? { shopId } : {}),
      },
      include: {
        requester: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @RequirePermission(PERMISSIONS.CORE.APPROVAL.MANAGE)
  @Roles(UserRole.OWNER)
  @Post(':id/resolve')
  async resolve(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { status: 'APPROVED' | 'REJECTED'; comment?: string },
  ) {
    return this.actionDispatcher.resolveRequest(
      id,
      req.user.id,
      data.status,
      data.comment,
    );
  }
}
