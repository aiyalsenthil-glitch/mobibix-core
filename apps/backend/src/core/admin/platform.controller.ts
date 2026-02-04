import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
  Req,
  Post,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PlansService } from '../billing/plans/plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformAuditService } from '../audit/platform-audit.service';
import { UpdatePlanDto, UpdatePlanFeaturesDto } from './dto/update-plan.dto';
import { WhatsAppFeature } from '../billing/whatsapp-rules';
import { PlanRulesService } from '../billing/plan-rules.service';

/**
 * Platform Admin Controller
 * Restricted to SUPER_ADMIN role only
 * Manages plan rules, features, and other platform-level settings
 */
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Use ADMIN until SUPER_ADMIN role is fully migrated
export class PlatformController {
  constructor(
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
    private readonly audit: PlatformAuditService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  /**
   * GET /platform/plans
   * List all plans with their features
   */
  @Get('plans')
  async listPlansWithFeatures() {
    const plans = await this.prisma.plan.findMany({
      include: { planFeatures: true },
      orderBy: { level: 'asc' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      level: plan.level,
      module: plan.module,
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      isAddon: plan.isAddon,
      features: plan.planFeatures.map((pf) => ({
        feature: pf.feature,
        enabled: pf.enabled,
      })),
    }));
  }

  /**
   * PATCH /platform/plans/:planId
   * Update plan settings
   */
  @Patch('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @Req() req: any,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    const updated = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.module !== undefined && { module: dto.module }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
        ...(dto.isAddon !== undefined && { isAddon: dto.isAddon }),
      },
    });

    await this.audit.log({
      userId: req.user.sub,
      action: 'UPDATE_PLAN',
      entity: 'Plan',
      entityId: planId,
      meta: dto,
    });

    // Invalidate plan rules cache
    this.planRulesService.invalidateByPlanId(planId);

    return updated;
  }

  /**
   * POST /platform/plans/:planId/features
   * Update/toggle a specific feature for a plan
   */
  @Post('plans/:planId/features')
  async updatePlanFeature(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanFeaturesDto,
    @Req() req: any,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new BadRequestException('Plan not found');
    }

    const updated = await this.prisma.planFeature.upsert({
      where: {
        planId_feature: {
          planId,
          feature: dto.feature,
        },
      },
      create: {
        planId,
        feature: dto.feature,
        enabled: dto.enabled,
      },
      update: {
        enabled: dto.enabled,
      },
    });

    await this.audit.log({
      userId: req.user.sub,
      action: 'UPDATE_PLAN_FEATURE',
      entity: 'PlanFeature',
      entityId: updated.id,
      meta: { planId, feature: dto.feature, enabled: dto.enabled },
    });

    // Invalidate plan rules cache
    this.planRulesService.invalidateByPlanId(planId);

    return updated;
  }

  /**
   * GET /platform/features
   * Get available WhatsApp features
   */
  @Get('features')
  async getAvailableFeatures() {
    return Object.values(WhatsAppFeature).map((feature) => ({
      value: feature,
      label: feature.replace(/_/g, ' '),
    }));
  }
}
