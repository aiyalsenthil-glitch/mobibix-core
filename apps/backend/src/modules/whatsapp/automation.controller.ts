import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { AutomationService } from './automation.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  ValidateAutomationDto,
} from './dto/automation.dto';
import { ModuleType, UserRole } from '@prisma/client';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';

/**
 * ────────────────────────────────────────────────
 * WHATSAPP AUTOMATION API
 * ────────────────────────────────────────────────
 *
 * CRUD endpoints for managing safe WhatsApp automations
 *
 * Protected by JWT auth (admin/owner only recommended)
 */
@Controller('whatsapp/automations')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OWNER)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  /**
   * GET /api/whatsapp/automations/registry
   * Get event registry (for UI dropdowns)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Get('registry')
  getEventRegistry() {
    return this.automationService.getEventRegistry();
  }

  /**
   * GET /api/whatsapp/automations/statistics
   * Get automation statistics
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Get('statistics')
  getStatistics() {
    return this.automationService.getStatistics();
  }

  /**
   * GET /api/whatsapp/automations
   * List all automations (optionally filtered by moduleType)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Get()
  findAll(@Query('moduleType') moduleType?: string) {
    return this.automationService.findAll(moduleType as ModuleType | undefined);
  }

  /**
   * GET /api/whatsapp/automations/:id
   * Get single automation
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.automationService.findOne(id);
  }

  /**
   * POST /api/whatsapp/automations
   * Create new automation
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Post()
  create(@Body() dto: CreateAutomationDto) {
    return this.automationService.create(dto);
  }

  /**
   * PATCH /api/whatsapp/automations/:id
   * Update automation
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAutomationDto) {
    return this.automationService.update(id, dto);
  }

  /**
   * DELETE /api/whatsapp/automations/:id
   * Delete automation
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.automationService.delete(id);
  }

  /**
   * POST /api/whatsapp/automations/validate
   * Validate automation safety (for UI testing)
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.WHATSAPP.AUTOMATION_MANAGE)
  @Post('validate')
  validate(@Body() dto: ValidateAutomationDto) {
    return this.automationService.validateAutomation(dto);
  }
}
