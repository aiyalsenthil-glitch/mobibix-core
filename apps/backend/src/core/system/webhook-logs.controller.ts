import { Controller, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, WebhookStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin - System')
@Controller('admin/system/webhooks')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class WebhookLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('failed')
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
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get webhook details' })
  async getWebhookDetails(@Param('id') id: string) {
    return this.prisma.webhookEvent.findUnique({
      where: { id },
    });
  }
}
