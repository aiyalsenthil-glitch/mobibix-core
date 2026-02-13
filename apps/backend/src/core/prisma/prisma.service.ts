import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCtx, setCtx } from '../cls/async-context';
import { withSoftDeleteFilter } from '../soft-delete/soft-delete.helper';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const adapter = new PrismaPg({ connectionString });

    super({ adapter });

    const softDeleteModels = new Set([
      'Tenant',
      'User',
      'Member',
      'Party',
      'Shop',
      'Invoice',
    ]);

    const baseClient = this;
    const extendedClient = this.$extends({
      query: {
        $allModels: {
          async findUnique({ model, args, query }: any) {
            if (!model || !softDeleteModels.has(model)) {
              return query(args);
            }

            const where = args?.where ?? {};
            const filteredWhere = withSoftDeleteFilter(where);
            const hasDeletedAtFilter = Object.prototype.hasOwnProperty.call(
              where,
              'deletedAt',
            );

            if (!hasDeletedAtFilter) {
              const delegateName =
                model.charAt(0).toLowerCase() + model.slice(1);
              const delegate = (baseClient as any)[delegateName];
              return delegate.findFirst({
                ...args,
                where: filteredWhere,
              });
            }

            return query(args);
          },
          async findUniqueOrThrow({ model, args, query }: any) {
            if (!model || !softDeleteModels.has(model)) {
              return query(args);
            }

            const where = args?.where ?? {};
            const filteredWhere = withSoftDeleteFilter(where);
            const hasDeletedAtFilter = Object.prototype.hasOwnProperty.call(
              where,
              'deletedAt',
            );

            if (!hasDeletedAtFilter) {
              const delegateName =
                model.charAt(0).toLowerCase() + model.slice(1);
              const delegate = (baseClient as any)[delegateName];
              return delegate.findFirstOrThrow({
                ...args,
                where: filteredWhere,
              });
            }

            return query(args);
          },
          async findFirst({ model, args, query }: any) {
            if (!model || !softDeleteModels.has(model)) {
              return query(args);
            }

            args.where = withSoftDeleteFilter(args?.where);

            return query(args);
          },
          async findFirstOrThrow({ model, args, query }: any) {
            if (!model || !softDeleteModels.has(model)) {
              return query(args);
            }

            args.where = withSoftDeleteFilter(args?.where);

            return query(args);
          },
          async findMany({ model, args, query }: any) {
            if (!model || !softDeleteModels.has(model)) {
              return query(args);
            }

            args.where = withSoftDeleteFilter(args?.where);

            return query(args);
          },
          async count({ model, args, query }: any) {
            if (!model || !softDeleteModels.has(model)) {
              return query(args);
            }

            args.where = withSoftDeleteFilter(args?.where);

            return query(args);
          },
          async aggregate({ model, args, query }: any) {
            if (!model || !softDeleteModels.has(model)) {
              return query(args);
            }

            args.where = withSoftDeleteFilter(args?.where);

            return query(args);
          },
          async groupBy({ model, args, query }: any) {
            if (!model || !softDeleteModels.has(model)) {
              return query(args);
            }

            const where = args?.where ?? {};
            const hasDeletedAtFilter = Object.prototype.hasOwnProperty.call(
              where,
              'deletedAt',
            );

            if (!hasDeletedAtFilter) {
              args.where = { ...where, deletedAt: null };
            }

            return query(args);
          },
        },
      },
    });

    Object.assign(this, extendedClient);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** 🔒 Tenant context helpers using AsyncLocalStorage */
  tenantWhere<T extends object>(where?: T): T {
    const tenantId = getCtx('tenantId');
    if (!tenantId) {
      throw new Error('Tenant context is missing');
    }

    return {
      ...(where ?? {}),
      tenantId,
    } as T;
  }

  tenantWhereOptional<T extends object>(where?: T): T {
    const tenantId = getCtx('tenantId');
    if (!tenantId) {
      return where ?? ({} as T);
    }

    return {
      ...(where ?? {}),
      tenantId,
    } as T;
  }

  // compatibility helpers (some modules read tenant id directly)
  getTenantId() {
    return getCtx('tenantId');
  }

  setTenantId(tenantId: string) {
    setCtx('tenantId', tenantId);
  }
  /**
   * 🔁 ONE-TIME BACKFILL:
   * Copy User.tenantId + User.role → UserTenant
   * Safe to run multiple times (idempotent)
   */
  async backfillUserTenants() {
    const users = await this.user.findMany({
      where: {
        tenantId: { not: null },
        role: { in: ['OWNER', 'STAFF'] },
      },
      select: {
        id: true,
        tenantId: true,
        role: true,
      },
    });

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      if (!user.tenantId || !user.role) {
        skipped++;
        continue;
      }

      await this.userTenant.upsert({
        where: {
          userId_tenantId: {
            userId: user.id,
            tenantId: user.tenantId,
          },
        },
        update: {
          role: user.role,
        },
        create: {
          userId: user.id,
          tenantId: user.tenantId,
          role: user.role,
        },
      });

      created++;
    }
  }
}
