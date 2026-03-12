import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HsnService } from './hsn.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModuleType } from '@prisma/client';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('core/hsn')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(JwtAuthGuard, GranularPermissionGuard)
export class HsnController {
  constructor(private readonly hsnService: HsnService) {}

  // Using UseGuards if implied by other modules, but for now assuming public or global auth
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('search')
  async search(@Query('query') query: string) {
    return this.hsnService.search(query || '');
  }
}
