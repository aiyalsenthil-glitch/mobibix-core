import {
  Controller,
  Get,
  Query,
  Req,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { StockKpiService } from './stock-kpi.service';

@Controller('mobileshop/stock/kpi')
export class StockKpiController {
  constructor(
    private readonly service: StockKpiService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  @Get('overview')
  async overview(
    @Req() req: any,
    @Query('shopId') shopId: string,
    @Query('period') period?: 'DAY' | 'WEEK' | 'MONTH',
    @Query('days') days?: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }
    if (!shopId) {
      throw new BadRequestException('shopId required');
    }

    const cacheKey = `kpi:${tenantId}:${shopId}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.service.overview(
      tenantId,
      shopId,
      period ?? 'MONTH',
      days ? Number(days) : 30,
    );

    await this.cache.set(cacheKey, result, 60);
    return result;
  }
}
