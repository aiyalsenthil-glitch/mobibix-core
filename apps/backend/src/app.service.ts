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

type TenantTypeOnly = { tenantType: string };

type TenantDelegate = {
  findMany: (args: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<unknown>;
};

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  private get tenantRepo(): TenantDelegate {
    return this.prisma.tenant as unknown as TenantDelegate;
  }

  getHello(): string {
    return 'Hello World!';
  }

  async getTenants(user: UserContext): Promise<TenantSummary[]> {
    // Get unique tenant types (modules) available to the user
    if (user.role?.toUpperCase() === 'ADMIN') {
      // Admin sees all unique tenant types
      const tenants = (await this.tenantRepo.findMany({
        select: {
          tenantType: true,
        },
        distinct: ['tenantType'],
        orderBy: {
          tenantType: 'asc',
        },
      })) as TenantTypeOnly[];

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
      const tenant = (await this.tenantRepo.findUnique({
        where: { id: user.tenantId },
        select: {
          tenantType: true,
        },
      })) as TenantTypeOnly | null;

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

    const tenants = (await this.tenantRepo.findMany({
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
