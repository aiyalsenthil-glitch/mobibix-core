import {
  Controller,
  Get,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ✅ THIS IS THE IMPORTANT ENDPOINT
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyTenant(@Req() req: any) {
    const user = req.user;

    if (!user?.tenantId) {
      throw new NotFoundException('User has no tenant');
    }

    const tenant = await this.tenantService.findById(user.tenantId);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }
}
