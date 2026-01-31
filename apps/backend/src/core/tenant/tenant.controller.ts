import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentTenant(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new NotFoundException('No active tenant');
    }
    return this.tenantService.getCurrentTenantPublic(tenantId);
  }

  /**
   * PUBLIC TENANT LOOKUP (QR CHECK-IN)
   */
  @Get('public/:code')
  async getPublicTenant(@Param('code') code: string) {
    return this.tenantService.getPublicTenantByCode(code);
  }

  // ...other controller methods...
}
