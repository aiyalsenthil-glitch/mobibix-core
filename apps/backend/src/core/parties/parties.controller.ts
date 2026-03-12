import {
  Controller,
  Get,
  Query,
  Req,
  BadRequestException,
  Param,
  UseGuards,
  Patch,
  Body,
} from '@nestjs/common';
import { PartiesService } from './parties.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { PartyType, UserRole, ModuleType } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('core/parties')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class PartiesController {
  constructor(private readonly service: PartiesService) {}

  @RequirePermission(PERMISSIONS.CORE.PARTY.VIEW)
  @Get('search')
  async search(
    @Req() req,
    @Query('query') query: string,
    @Query('type') type?: PartyType,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId || !query) {
      throw new BadRequestException('Invalid request');
    }

    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.service.searchParties(tenantId, query, type, limitNum);
  }

  @RequirePermission(PERMISSIONS.CORE.PARTY.VIEW)
  @Get(':id')
  async getOne(@Req() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.service.findById(tenantId, id);
  }

  @RequirePermission(PERMISSIONS.CORE.PARTY.MANAGE)
  @Patch(':id/upgrade')
  async upgrade(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { role: 'CUSTOMER' | 'VENDOR' }, // Helper DTO inline for simplicity as per instructions
  ) {
    const tenantId = req.user?.tenantId;
    if (!body.role || !['CUSTOMER', 'VENDOR'].includes(body.role)) {
      throw new BadRequestException('Invalid role. Must be CUSTOMER or VENDOR');
    }

    const party = await this.service.upgradeRole(tenantId, id, body.role);

    if (!party) {
      throw new BadRequestException('Party not found'); // Using 400/404 based on pref, using BadRequest for safety or NotFoundException
    }

    return party;
  }

  @RequirePermission(PERMISSIONS.CORE.PARTY.VIEW)
  @Get(':id/balance')
  async getBalance(@Req() req, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.service.getBalance(tenantId, id);
  }
}
