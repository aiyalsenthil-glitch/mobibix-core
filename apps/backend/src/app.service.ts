import { Injectable } from '@nestjs/common';
import { PrismaService } from './core/prisma/prisma.service';

export interface UserContext {
  role?: string;
  tenantId?: string;
}

type TenantSummary = {
  id: string;
  name: string;
  tenantType: string;
};

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getTenants(user: UserContext): Promise<TenantSummary[]> {
    // Get unique tenant types (modules) available to the user
    if (user.role?.toUpperCase() === 'ADMIN') {
      // Admin sees all unique tenant types
      const tenants = (await this.prisma.tenant.findMany({
        select: {
          tenantType: true,
        },
        distinct: ['tenantType'],
        orderBy: {
          tenantType: 'asc',
        },
      })) as Array<{ tenantType: string }>;

      // Transform to return module info
      const moduleMap: Record<string, string> = {
        gym: 'Gym SaaS',
        mobileshop: 'Mobileshop',
        other: 'Other',
      };

      return tenants.map((t) => ({
        id: t.tenantType,
        name: moduleMap[t.tenantType.toLowerCase()] || t.tenantType,
        tenantType: t.tenantType,
      }));
    }

    // Return user's tenant type
    if (user.tenantId) {
      const tenant = (await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          tenantType: true,
        },
      })) as { tenantType: string } | null;

      if (tenant) {
        const moduleMap: Record<string, string> = {
          gym: 'Gym SaaS',
          mobileshop: 'Mobileshop',
          other: 'Other',
        };

        return [
          {
            id: tenant.tenantType,
            name:
              moduleMap[tenant.tenantType.toLowerCase()] || tenant.tenantType,
            tenantType: tenant.tenantType,
          },
        ];
      }
    }

    return [];
  }

  async getTenantsByType(
    user: UserContext,
    tenantType: string,
  ): Promise<TenantSummary[]> {
    // Get actual tenant instances of a specific type
    if (user.role?.toUpperCase() !== 'ADMIN') {
      // Non-admins should only see their own tenants
      return [];
    }

    const tenants = (await this.prisma.tenant.findMany({
      where: {
        tenantType: {
          equals: tenantType,
          mode: 'insensitive',
        },
        subscription: {
          some: {
            status: { in: ['ACTIVE', 'TRIAL'] },
            plan: {
              name: 'ULTIMATE',
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        tenantType: true,
      },
      orderBy: {
        name: 'asc',
      },
    })) as TenantSummary[];

    return tenants;
  }
}
