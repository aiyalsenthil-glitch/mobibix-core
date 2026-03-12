import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole, PartnerStatus, ModuleType } from '@prisma/client';
import { PartnersService } from '../../../modules/partners/partners.service';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';
import { GeneratePromoDto } from '../../../modules/partners/dto/create-partner.dto';

@Controller('admin/partners')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, AdminRolesGuard, GranularPermissionGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.PRODUCT_ADMIN)
export class AdminPartnerController {
  constructor(private readonly partnersService: PartnersService) {}

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get()
  async listPartners(@Query('status') status?: PartnerStatus) {
    return this.partnersService.listPartners(status);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Patch(':id/approve')
  async approvePartner(
    @Param('id') id: string,
    @Body('firstCommissionPct') firstCommissionPct: number = 30,
    @Body('renewalCommissionPct') renewalCommissionPct: number = 10,
    @Req() req: any,
  ) {
    const adminId = req.adminUser.userId;
    return this.partnersService.approvePartner(id, adminId, firstCommissionPct, renewalCommissionPct);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Patch(':id/suspend')
  async suspendPartner(@Param('id') id: string, @Req() req: any) {
    const adminId = req.adminUser.userId;
    return this.partnersService.suspendPartner(id, adminId);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Patch(':id/payout')
  async markPayout(@Param('id') id: string) {
    return this.partnersService.markPartnerPayout(id);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('promos')
  async listPromos() {
    return this.partnersService.listPromoCodes();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Post('promos/generate')
  async generatePromo(@Body() dto: GeneratePromoDto, @Req() req: any) {
    const adminId = req.adminUser.userId;
    return this.partnersService.createPromoCode({
      ...dto,
      adminId,
    });
  }
}
