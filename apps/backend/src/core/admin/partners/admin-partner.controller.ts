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
import { AdminRole, PartnerStatus } from '@prisma/client';
import { PartnersService } from '../../../modules/partners/partners.service';
import { GeneratePromoDto } from '../../../modules/partners/dto/create-partner.dto';

@Controller('admin/partners')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.PRODUCT_ADMIN)
export class AdminPartnerController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  async listPartners(@Query('status') status?: PartnerStatus) {
    return this.partnersService.listPartners(status);
  }

  @Patch(':id/approve')
  async approvePartner(
    @Param('id') id: string,
    @Body('commission') commission: number,
    @Req() req: any,
  ) {
    // adminId from the adminUser object attached by AdminRolesGuard
    const adminId = req.adminUser.userId;
    return this.partnersService.approvePartner(id, adminId, commission);
  }

  @Patch(':id/suspend')
  async suspendPartner(@Param('id') id: string, @Req() req: any) {
    const adminId = req.adminUser.userId;
    return this.partnersService.suspendPartner(id, adminId);
  }

  @Get('promos')
  async listPromos() {
    return this.partnersService.listPromoCodes();
  }

  @Post('promos/generate')
  async generatePromo(@Body() dto: GeneratePromoDto, @Req() req: any) {
    const adminId = req.adminUser.userId;
    return this.partnersService.createPromoCode({
      ...dto,
      adminId,
    });
  }
}
