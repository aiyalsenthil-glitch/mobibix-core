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
import { AdvanceApplicationService } from './advance-application.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('vouchers')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class VouchersHardeningController {
  constructor(
    private readonly advanceApplicationService: AdvanceApplicationService,
  ) {}

  /**
   * POST /advance/:id/apply-to-purchase - Apply supplier advance to purchase
   */
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
