import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PlatformService } from './platform.service';
import {
  UpdatePlanDto,
  UpdatePlanFeaturesDto,
  CreatePlanFeatureDto,
} from './dto/platform.dto';

/**
 * Platform Admin Controller
 * SUPER_ADMIN only
 * Manage plans and features dynamically
 */
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  // ─────────────────────────────────────────────
  // PLANS MANAGEMENT
  // ─────────────────────────────────────────────

  /**
   * GET /platform/plans
   * List all plans with features
   */
  @Get('plans')
  async listPlans() {
    return this.platformService.listAllPlans();
  }

  /**
   * GET /platform/plans/:planId
   * Get single plan with features
   */
  @Get('plans/:planId')
  async getPlan(@Param('planId') planId: string) {
    return this.platformService.getPlanWithFeatures(planId);
  }

  /**
   * PATCH /platform/plans/:planId
   * Update plan (maxMembers, isActive, etc.)
   */
  @Patch('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.platformService.updatePlan(planId, dto);
  }

  /**
   * PATCH /platform/plans/:planId/features
   * Update plan features (enable/disable WhatsApp features)
   */
  @Patch('plans/:planId/features')
  async updatePlanFeatures(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanFeaturesDto,
  ) {
    if (!dto.features || dto.features.length === 0) {
      throw new BadRequestException('Features array cannot be empty');
    }

    return this.platformService.updatePlanFeatures(planId, dto.features);
  }

  /**
   * POST /platform/plans/:planId/features
   * Add a single feature to plan
   */
  @Post('plans/:planId/features')
  async addPlanFeature(
    @Param('planId') planId: string,
    @Body() dto: CreatePlanFeatureDto,
  ) {
    return this.platformService.addFeatureToPlan(
      planId,
      dto.feature,
      dto.enabled ?? true,
    );
  }

  // ─────────────────────────────────────────────
  // FEATURE MATRIX VIEW
  // ─────────────────────────────────────────────

  /**
   * GET /platform/features/matrix
   * Get feature availability matrix (plan vs features grid)
   */
  @Get('features/matrix')
  async getFeatureMatrix() {
    return this.platformService.getFeatureMatrix();
  }
}
