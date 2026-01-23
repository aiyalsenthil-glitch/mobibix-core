import {
  Body,
  Controller,
  Post,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { RepairService } from './repair.service';
import { RepairStockOutDto } from './dto/repair-stock-out.dto';

@Controller('mobileshop/stock')
export class RepairController {
  constructor(private readonly service: RepairService) {}

  @Post('out/repair')
  async repairOut(@Req() req, @Body() dto: RepairStockOutDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Invalid tenant');

    return this.service.stockOutForRepair(tenantId, dto);
  }
}
