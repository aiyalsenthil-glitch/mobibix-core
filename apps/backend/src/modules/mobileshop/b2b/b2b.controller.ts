import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { B2BService } from './b2b.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { UserRole } from '@prisma/client';

@Controller('mobileshop/b2b')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class B2BController extends TenantScopedController {
  constructor(private readonly b2bService: B2BService) {
    super();
  }

  @Post('onboard-distributor')
  async onboard(@Body() body: any) {
    return this.b2bService.onboardDistributor(body);
  }

  @Get('catalog')
  async getCatalog(@CurrentUser() user: any) {
    return this.b2bService.getAvailableWholesaleItems(user.tenantId);
  }

  @Post('link/:distributorId')
  async link(
    @CurrentUser() user: any,
    @Param('distributorId') distributorId: string,
  ) {
    return this.b2bService.requestLink(user.tenantId, distributorId);
  }

  @Post('order')
  async placeOrder(@CurrentUser() user: any, @Body() body: any) {
    return this.b2bService.placeB2BOrder(user.tenantId, body);
  }
}
