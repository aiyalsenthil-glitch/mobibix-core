import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin/webhooks')
@Roles('ADMIN')
export class AdminWebhooksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listWebhookEvents() {
    return this.prisma.webhookEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
  }
}
