import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { GymPlanType } from '@prisma/client';

export class CreateGymPlanDto {
  name: string;
  durationDays: number;
  price: number; // paise
  type?: GymPlanType;
  description?: string;
}

export class UpdateGymPlanDto {
  name?: string;
  durationDays?: number;
  price?: number;
  type?: GymPlanType;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class GymPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(tenantId: string) {
    return this.prisma.gymPlan.findMany({
      where: { tenantId, isActive: true },
      orderBy: { durationDays: 'asc' },
    });
  }

  async createPlan(tenantId: string, dto: CreateGymPlanDto, createdBy?: string) {
    return this.prisma.gymPlan.create({
      data: {
        tenantId,
        name: dto.name,
        durationDays: dto.durationDays,
        price: dto.price,
        type: dto.type ?? 'MONTHLY',
        description: dto.description,
      },
    });
  }

  async updatePlan(tenantId: string, planId: string, dto: UpdateGymPlanDto) {
    await this.findOrFail(tenantId, planId);
    return this.prisma.gymPlan.update({
      where: { id: planId },
      data: dto,
    });
  }

  async deletePlan(tenantId: string, planId: string) {
    await this.findOrFail(tenantId, planId);
    // Soft delete — just deactivate
    await this.prisma.gymPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });
    return { success: true };
  }

  private async findOrFail(tenantId: string, planId: string) {
    const plan = await this.prisma.gymPlan.findFirst({
      where: { id: planId, tenantId },
    });
    if (!plan) throw new NotFoundException('Gym plan not found');
    return plan;
  }
}
