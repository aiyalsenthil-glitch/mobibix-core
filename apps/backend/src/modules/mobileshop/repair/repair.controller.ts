import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { RepairService } from './repair.service';
import { RepairStockOutDto } from './dto/repair-stock-out.dto';
import { RepairBillDto } from './dto/repair-bill.dto';

@Controller('mobileshop/repairs')
@UseGuards(JwtAuthGuard)
export class RepairController {
  constructor(private repairService: RepairService) {}

  @Post('out')
  async stockOut(@Req() req: any, @Body() dto: RepairStockOutDto) {
    const tenantId = req.user?.sub || req.user?.userId;
    return this.repairService.stockOutForRepair(tenantId, dto);
  }

  @Post(':jobCardId/bill')
  async generateBill(
    @Req() req: any,
    @Param('jobCardId') jobCardId: string,
    @Body() dto: RepairBillDto,
  ) {
    const tenantId = req.user?.sub || req.user?.userId;
    const dtoWithJobId = { ...dto, jobCardId };
    return this.repairService.generateRepairBill(tenantId, dtoWithJobId);
  }
}
