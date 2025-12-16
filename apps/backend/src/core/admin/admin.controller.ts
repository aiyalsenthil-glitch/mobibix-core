import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { TenantService } from '../tenant/tenant.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';

@UseGuards(JwtAuthGuard)
@Roles(Role.OWNER)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // ─────────────────────────────────────────────
  // LIST ALL TENANTS
  // ─────────────────────────────────────────────
  @Get('tenants')
  async listTenants() {
    return this.tenantService.listTenantsWithSubscription();
  }

  // ─────────────────────────────────────────────
  // GET TENANT SUBSCRIPTION
  // ─────────────────────────────────────────────
  @Get('tenants/:tenantId/subscription')
  async getTenantSubscription(@Param('tenantId') tenantId: string) {
    return this.subscriptionsService.getSubscriptionByTenant(tenantId);
  }

  // ─────────────────────────────────────────────
  // EXTEND TRIAL
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/extend-trial')
  async extendTrial(
    @Param('tenantId') tenantId: string,
    @Body() body: { extraDays: number },
  ) {
    return this.subscriptionsService.extendTrial(tenantId, body.extraDays);
  }

  // ─────────────────────────────────────────────
  // CHANGE STATUS (ACTIVE / EXPIRED / CANCELLED)
  // ─────────────────────────────────────────────
  @Patch('tenants/:tenantId/status')
  async changeStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: { status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' },
  ) {
    return this.subscriptionsService.changeStatus(tenantId, body.status);
  }
}
