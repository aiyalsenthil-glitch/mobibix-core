import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockCorrectionService } from './stock-correction.service';
import { StockCorrectionDto } from './dto/stock-correction.dto';

type ReqWithUser = { user?: { tenantId?: string; sub?: string } };

@UseGuards(JwtAuthGuard)
@Controller('mobileshop/stock')
export class StockCorrectionController {
  constructor(private readonly service: StockCorrectionService) {}

  @Post('correct')
  async correct(@Req() req: ReqWithUser, @Body() dto: StockCorrectionDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.correctStock(tenantId, req.user?.sub, dto);
  }
}
