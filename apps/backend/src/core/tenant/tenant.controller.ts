import { Controller, Get, Param } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * PUBLIC TENANT LOOKUP (QR CHECK-IN)
   */
  @Get('public/:code')
  async getPublicTenant(@Param('code') code: string) {
    return this.tenantService.getPublicTenantByCode(code);
  }

  // ...other controller methods...
}
