import { Controller, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminWebhooksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listWebhookEvents() {
    return this.prisma.webhookEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
  }

  @Get(':id')
  async getWebhookEvent(id: string) {
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }
}
