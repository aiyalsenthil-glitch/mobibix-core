import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PermissionService } from './permissions.service';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';

@Controller('permissions/roles')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER)
export class RolesController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  async list(@Req() req: any) {
    return this.permissionService.listRoles(req.user.tenantId);
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const role = await this.permissionService.getRoleById(id, req.user.tenantId);
    const permissions = await this.permissionService.getRolePermissions(id);
    return { ...role, permissions };
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() data: { name: string; description: string; permissions: string[] },
  ) {
    return this.permissionService.createRole(
      req.user.tenantId,
      data.name,
      data.description,
      data.permissions,
    );
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.permissionService.updateRole(id, req.user.tenantId, data);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.permissionService.deleteRole(id, req.user.tenantId);
  }

  @Post('seed')
  async seed() {
    return this.permissionService.seedPermissions();
  }
}
