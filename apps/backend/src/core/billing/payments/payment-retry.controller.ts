import { Controller, Post, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PaymentRetryService } from './payment-retry.service';

@ApiTags('Admin - Payments')
@Controller('admin/payments')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class PaymentRetryController {
  private readonly logger = new Logger(PaymentRetryController.name);

  constructor(private readonly paymentRetryService: PaymentRetryService) {}

  @Post(':id/retry')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually schedule a retry/dunning attempt for a failed payment' })
  async manualRetry(@Param('id') id: string) {
    this.logger.log(`[ADMIN] Manual retry requested for payment ${id}`);
    await this.paymentRetryService.scheduleRetry(id);
    return {
      status: 'success',
      message: 'Retry scheduled. Background job will process it if due.',
    };
  }
}
