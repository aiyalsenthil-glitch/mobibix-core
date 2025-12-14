import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createTenant(@Req() req: any, @Body() dto: CreateTenantDto) {
    const userId = req.user.id;
    return this.tenantService.createTenant(userId, dto.name);
  }
}
