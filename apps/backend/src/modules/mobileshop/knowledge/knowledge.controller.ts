import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';
import { 
  CreateFaultDiagnosisDto, 
  CreateRepairKnowledgeDto, 
  CreateFaultTypeDto 
} from './dto/knowledge.dto';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantScopedController } from '../../../core/auth/tenant-scoped.controller';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@Controller('mobileshop/knowledge')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('repair_knowledge')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF, UserRole.TECHNICIAN)
export class KnowledgeController extends TenantScopedController {
  constructor(private knowledgeService: KnowledgeService) {
    super();
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.REPAIR_KNOWLEDGE.VIEW)
  @Get('checklist/:faultTypeId')
  async getChecklist(@Req() req: any, @Param('faultTypeId') faultTypeId: string) {
    const tenantId = this.getTenantId(req);
    return this.knowledgeService.getChecklist(faultTypeId, tenantId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.REPAIR_KNOWLEDGE.VIEW)
  @Get('notes')
  async getNotes(
    @Req() req: any,
    @Query('phoneModelId') phoneModelId: string,
    @Query('faultTypeId') faultTypeId: string,
  ) {
    const tenantId = this.getTenantId(req);
    return this.knowledgeService.getRepairNotes(phoneModelId, faultTypeId, tenantId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.REPAIR_KNOWLEDGE.VIEW)
  @Get('job/:jobCardId')
  async getForJob(@Req() req: any, @Param('jobCardId') jobCardId: string) {
    const tenantId = this.getTenantId(req);
    return this.knowledgeService.getKnowledgeForJob(tenantId, jobCardId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.REPAIR_KNOWLEDGE.MANAGE)
  @Post('fault-type')
  async createFaultType(@Body() dto: CreateFaultTypeDto) {
    return this.knowledgeService.createFaultType(dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.REPAIR_KNOWLEDGE.MANAGE)
  @Post('checklist')
  async createChecklist(@Req() req: any, @Body() dto: CreateFaultDiagnosisDto) {
    const tenantId = this.getTenantId(req);
    return this.knowledgeService.createFaultDiagnosis(tenantId, dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.REPAIR_KNOWLEDGE.MANAGE)
  @Post('notes')
  async createNote(@Req() req: any, @Body() dto: CreateRepairKnowledgeDto) {
    const tenantId = this.getTenantId(req);
    const userId = req.user.userId;
    return this.knowledgeService.createRepairNote(tenantId, userId, dto);
  }
}
