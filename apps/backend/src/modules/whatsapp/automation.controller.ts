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
import { AutomationService } from './automation.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  ValidateAutomationDto,
} from './dto/automation.dto';
import { ModuleType } from '@prisma/client';

/**
 * ────────────────────────────────────────────────
 * WHATSAPP AUTOMATION API
 * ────────────────────────────────────────────────
 *
 * CRUD endpoints for managing safe WhatsApp automations
 *
 * Protected by JWT auth (admin/owner only recommended)
 */
@Controller('api/whatsapp/automations')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  /**
   * GET /api/whatsapp/automations/registry
   * Get event registry (for UI dropdowns)
   */
  @Get('registry')
  getEventRegistry() {
    return this.automationService.getEventRegistry();
  }

  /**
   * GET /api/whatsapp/automations/statistics
   * Get automation statistics
   */
  @Get('statistics')
  getStatistics() {
    return this.automationService.getStatistics();
  }

  /**
   * GET /api/whatsapp/automations
   * List all automations (optionally filtered by moduleType)
   */
  @Get()
  findAll(@Query('moduleType') moduleType?: string) {
    return this.automationService.findAll(moduleType as ModuleType | undefined);
  }

  /**
   * GET /api/whatsapp/automations/:id
   * Get single automation
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.automationService.findOne(id);
  }

  /**
   * POST /api/whatsapp/automations
   * Create new automation
   */
  @Post()
  create(@Body() dto: CreateAutomationDto) {
    return this.automationService.create(dto);
  }

  /**
   * PATCH /api/whatsapp/automations/:id
   * Update automation
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAutomationDto) {
    return this.automationService.update(id, dto);
  }

  /**
   * DELETE /api/whatsapp/automations/:id
   * Delete automation
   */
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.automationService.delete(id);
  }

  /**
   * POST /api/whatsapp/automations/validate
   * Validate automation safety (for UI testing)
   */
  @Post('validate')
  validate(@Body() dto: ValidateAutomationDto) {
    return this.automationService.validateAutomation(dto);
  }
}
