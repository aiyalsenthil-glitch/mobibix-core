import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActionDispatcherService } from './action-dispatcher.service';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';

@Controller('permissions/approvals')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
export class ApprovalsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionDispatcher: ActionDispatcherService,
  ) {}

  @Get('pending')
  @Roles(UserRole.OWNER)
  async listPending(@Req() req: any) {
    return this.prisma.approvalRequest.findMany({
      where: {
        tenantId: req.user.tenantId,
        status: 'PENDING',
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

  @Post(':id/resolve')
  @Roles(UserRole.OWNER)
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
