import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantService } from './tenant.service';
import { SubscriptionGuard } from '../billing/guards/subscription.guard';

@Controller('tenant')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('me')
  async getMyTenant(@Req() req: any) {
    return this.tenantService.findById();
  }

  @Post()
  async create(@Req() req: any, @Body() body: { name: string }) {
    const user = req.user;
    if (!user?.id) {
      throw new BadRequestException('Authentication required');
    }
    if (!body?.name) {
      throw new BadRequestException('Tenant name required');
    }

    return this.tenantService.createTenant(user.id, body.name);
  }
  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getMySubscription(@Req() req: any) {
    return this.subscriptionsService.getSubscriptionByTenant(req.user.tenantId);
  }
}
