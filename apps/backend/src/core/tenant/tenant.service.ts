import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../billing/plans/plans.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { CreateTenantDto } from './dto/tenant.dto';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * ============================
   * CREATE TENANT (ONBOARDING)
   * ============================
   */
  async createTenant(userId: string, dto: CreateTenantDto) {
    // 🔒 Safety guard (prevents Prisma crash)
    if (!userId) {
      throw new BadRequestException('Invalid user session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.tenantId) {
      throw new BadRequestException('User already has a tenant');
    }

    await this.plansService.ensureDefaultPlans();
    const trialPlan = await this.plansService.getOrCreateTrialPlan();

    const code =
      dto.code ??
      `${dto.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        code,
        tenantType: dto.tenantType,
        contactPhone: dto.contactPhone,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        country: dto.country,
        currency: dto.currency,
        timezone: dto.timezone,
      },
    });

    await this.subscriptionsService.assignTrialSubscription(
      tenant.id,
      trialPlan.id,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tenantId: tenant.id,
        role: UserRole.OWNER,
      },
    });

    return tenant;
  }
  async searchTenants(query: string) {
    return this.prisma.tenant.findMany({
      where: {
        OR: [{ name: { contains: query, mode: 'insensitive' } }],
      },
      take: 20,
    });
  }

  async updateTenantName(tenantId: string, name: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { name },
    });
  }

  async getPublicByCode(code: string) {
    return this.prisma.tenant.findFirst({
      where: { code },
      select: { id: true, name: true },
    });
  }

  async getPublicTenantByCode(code: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code },
      select: {
        id: true,
        name: true,
        kioskToken: true,
      },
    });

    if (!tenant || !tenant.kioskToken) {
      throw new NotFoundException('Gym not available');
    }

    return tenant;
  }

  async generateKioskToken(tenantId: string) {
    const token = randomBytes(32).toString('hex');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { kioskToken: token },
      select: {
        id: true,
        kioskToken: true,
      },
    });
  }
  /**
   * ============================
   * GET TENANT BY ID
   * ============================
   */
  async findById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  /**
   * ============================
   * TENANT USAGE / PLAN INFO
   * ============================
   */
  async getUsage(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant not initialized');
    }

    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return {
        plan: 'NONE',
        status: 'NONE',
        membersUsed: 0,
        membersLimit: null,
        daysLeft: null,
      };
    }

    const membersUsed = await this.prisma.member.count({
      where: { tenantId },
    });

    const plan = subscription.plan;
    const membersLimit = plan?.memberLimit ?? null;

    let daysLeft: number | null = null;

    if (subscription.endDate) {
      const now = new Date();
      const end = new Date(subscription.endDate);
      const diff = end.getTime() - now.getTime();
      daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      plan: plan.name,
      status: subscription.status,
      membersUsed,
      membersLimit,
      daysLeft,
    };
  }

  /**
   * ============================
   * ADMIN / INTERNAL
   * ============================
   */
  async listTenantsWithSubscription() {
    return this.prisma.tenant.findMany({
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
  }
  async getUserForAuth(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
  issueJwt(user: { id: string; tenantId: string | null; role: UserRole }) {
    return this.jwtService.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });
  }
}
