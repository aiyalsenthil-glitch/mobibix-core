import { Controller, Post, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { PaymentRetryService } from './payment-retry.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';
import { ModulePermission, RequirePermission } from '../../permissions/decorators/require-permission.decorator';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@ApiTags('Admin - Payments')
@Controller('admin/payments')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
@ApiBearerAuth()
export class PaymentRetryController {
  private readonly logger = new Logger(PaymentRetryController.name);

  constructor(private readonly paymentRetryService: PaymentRetryService) {}

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Roles(UserRole.SUPER_ADMIN)
  @Post(':id/retry')
  @ApiOperation({
    summary: 'Manually schedule a retry/dunning attempt for a failed payment',
  })
  async manualRetry(@Param('id') id: string) {
    this.logger.log(`[ADMIN] Manual retry requested for payment ${id}`);
    await this.paymentRetryService.scheduleRetry(id);
    return {
      status: 'success',
      message: 'Retry scheduled. Background job will process it if due.',
    };
  }
}
