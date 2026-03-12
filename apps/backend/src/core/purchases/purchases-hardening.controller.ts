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
import { PurchasesService } from './purchases.service';
import { GSTVerificationService } from './gst-verification.service';
import { PurchaseAuditService } from './purchase-audit.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('purchases')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class PurchasesHardeningController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly gstVerificationService: GSTVerificationService,
    private readonly auditService: PurchaseAuditService,
  ) {}

  /**
   * POST /:id/submit - Submit purchase for approval (atomic with stock ledger)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Post(':id/submit')
  @HttpCode(200)
  async submitPurchase(
    @Param('id') purchaseId: string,
    @Request() req: any,
  ): Promise<{ message: string; purchaseId: string }> {
    const tenantId = req.user.tenantId;
    const userId = req.user.sub;

    await this.auditService.logSubmissionAttempt(
      tenantId,
      purchaseId,
      userId,
      'ATTEMPT',
    );

    try {
      await this.purchasesService.atomicPurchaseSubmit(tenantId, purchaseId);

      await this.auditService.logSubmissionAttempt(
        tenantId,
        purchaseId,
        userId,
        'SUCCESS',
      );

      return {
        message: 'Purchase submitted successfully',
        purchaseId,
      };
    } catch (error) {
      await this.auditService.logSubmissionAttempt(
        tenantId,
        purchaseId,
        userId,
        'FAILED',
        { error: error.message },
      );
      throw error;
    }
  }

  /**
   * GET /legacy-gst/unverified - Get unverified legacy GST records for CA
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get('legacy-gst/unverified')
  async getUnverifiedLegacyGST(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.gstVerificationService.getUnverifiedLegacy(tenantId);
  }

  /**
   * POST /:id/verify-gst - CA verifies and corrects legacy GST
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Post(':id/verify-gst')
  @HttpCode(200)
  async verifyLegacyGST(
    @Param('id') purchaseId: string,
    @Body()
    body: {
      cgst: number;
      sgst: number;
      igst: number;
    },
    @Request() req: any,
  ): Promise<{ message: string }> {
    const tenantId = req.user.tenantId;
    const userId = req.user.sub;

    await this.gstVerificationService.verifyLegacyGST(
      tenantId,
      purchaseId,
      body.cgst,
      body.sgst,
      body.igst,
      userId,
    );

    return { message: 'Legacy GST verified successfully' };
  }
}
