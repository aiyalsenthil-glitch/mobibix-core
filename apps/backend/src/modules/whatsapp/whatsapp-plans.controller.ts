import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from '../../core/billing/plans/plans.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  CreatePlanDto,
  UpdatePlanDto,
  UpdatePlanStatusDto,
} from './dto/plan.dto';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class WhatsAppPlansController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * GET /whatsapp/plans
   * List all plans (for WhatsApp Master UI)
   */
  @Get('plans')
  async getPlans() {
    return this.plansService.getPlans();
  }

  /**
   * POST /whatsapp/plans
   * Create a new plan
   */
  @Post('plans')
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.createPlan({
      name: createPlanDto.name,
      code: createPlanDto.code,
      module: createPlanDto.module,
      isActive: createPlanDto.isActive,
    });
  }

  /**
   * PUT /whatsapp/plans/:id
   * Update plan details (price, durationDays, isActive)
   */
  @Put('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.plansService.updatePlan(id, {
      isActive: updatePlanDto.isActive,
    });
  }

  /**
   * PATCH /whatsapp/plans/:id/status
   * Toggle plan active status
   */
  @Patch('plans/:id/status')
  async updatePlanStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdatePlanStatusDto,
  ) {
    return this.plansService.updatePlan(id, {
      isActive: statusDto.isActive,
    });
  }
}
