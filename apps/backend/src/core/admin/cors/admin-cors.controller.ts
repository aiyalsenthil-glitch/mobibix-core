import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminCorsService } from './admin-cors.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';

class CreateCorsOriginDto {
  @IsUrl({
    require_tld: false, // allow localhost
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  origin: string;

  @IsOptional()
  @IsString()
  label?: string;
}

class UpdateCorsOriginDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

@Controller('admin/cors')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.ADMIN)
export class AdminCorsController {
  constructor(private readonly corsService: AdminCorsService) {}

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get()
  findAll() {
    return this.corsService.findAll();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Post()
  create(@Body() dto: CreateCorsOriginDto) {
    return this.corsService.create(dto.origin, dto.label);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCorsOriginDto) {
    return this.corsService.update(id, dto);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.corsService.remove(id);
  }
}
