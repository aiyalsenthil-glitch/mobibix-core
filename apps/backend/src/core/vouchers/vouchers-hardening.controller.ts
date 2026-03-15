import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { AdvanceApplicationService } from './advance-application.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('vouchers')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class VouchersHardeningController {
  constructor(
    private readonly advanceApplicationService: AdvanceApplicationService,
  ) {}

  /**
   * POST /advance/:id/apply-to-purchase - Apply supplier advance to purchase
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.VOUCHER.CREATE)
  @Post('advance/:voucherId/apply-to-purchase')
  @HttpCode(200)
  async applyAdvanceToPurchase(
    @Param('voucherId') advanceVoucherId: string,
    @Body()
    body: {
      purchaseId: string;
      appliedAmount: number;
    },
    @Request() req: any,
  ): Promise<{ message: string; appliedAmount: number }> {
    const tenantId = req.user.tenantId;

    await this.advanceApplicationService.applyAdvanceToPurchase(
      tenantId,
      advanceVoucherId,
      body.purchaseId,
      body.appliedAmount,
    );

    return {
      message: 'Advance applied to purchase successfully',
      appliedAmount: body.appliedAmount,
    };
  }

  /**
   * GET /advance/:id/balance - Get advance balance (total - applied)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.VOUCHER.VIEW)
  @Get('advance/:voucherId/balance')
  async getAdvanceBalance(
    @Param('voucherId') advanceVoucherId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.advanceApplicationService.getAdvanceBalance(
      tenantId,
      advanceVoucherId,
    );
  }

  /**
   * GET /advance/:id/applications - Get purchases this advance is applied to
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.VOUCHER.VIEW)
  @Get('advance/:voucherId/applications')
  async getAdvanceApplications(
    @Param('voucherId') advanceVoucherId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    const balance = await this.advanceApplicationService.getAdvanceBalance(
      tenantId,
      advanceVoucherId,
    );
    return {
      advance: balance,
      // Additional details would require extended data fetch
    };
  }
}
