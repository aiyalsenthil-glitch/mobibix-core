import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
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
      throw new InternalServerErrorException(
        'DATABASE_URL environment variable is not set',
      );
    }

    const adapter = new PrismaPg({ connectionString });

    super({ adapter });

    const softDeleteModels = new Set<string>([
      'Tenant',
      'User',
      'Member',
      'Party',
      'Shop',
      'Invoice',
      'Role',
      'UserTenant',
      'ShopStaff',
      'StaffInvite',
      'ApprovalRequest',
      'JobCard',
      'B2BPurchaseOrder',
      // CustomerAlert - no deletedAt field (uses resolved boolean)
      // CustomerFollowUp - no deletedAt field (uses status: PENDING/DONE/CANCELLED)
      // CustomerReminder - no deletedAt field (uses status: SCHEDULED/SENT/FAILED)
      // Contact - no deletedAt field
    ]);

    const multiTenantModels = new Set<string>([
      'Contact',
      'Member',
      'Party',
      'Shop',
      'Invoice',
      'Payment',
      'SupplierPayment',
      'SubscriptionInvoice',
      'UserTenant',
      'ShopStaff',
      'StaffInvite',
      'ApprovalRequest',
      'JobCard',
      'ShopProduct', // FIXED: Was missing!
      'StockLedger', // FIXED: Was missing!
      'StockCorrection', // FIXED: Was missing!
      'IMEI', // FIXED: Was missing!
      'NotificationLog', // FIXED: Was missing!
      'AiUsageLog', // FIXED: Was missing!
      'UsageSnapshot', // FIXED: Was missing!
      'FeatureFlag', // FIXED: Was missing!
      'CustomerAlert',
      'CustomerFollowUp',
      'CustomerReminder',
      'B2BPurchaseOrder',
      'GRN',
      'FinancialEntry',
      'LoyaltyTransaction',
      'LoyaltyAdjustment',
      'LoyaltyConfig',
      'DeletionRequest',
      'EmailLog',
      'WhatsAppLog',
      'WhatsAppMessageLog',
      'WhatsAppCampaign',
      'WhatsAppDailyUsage',
      'AuditLog', // FIXED: Was missing!
      'DailyClosing',
      'ShiftClosing',
    ]);

    const rootClient = this as any;
    const extendedClient = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const tenantId = getCtx('tenantId');
            const skipTenantCheck = getCtx('isInternalQuery') === true;
            const start = Date.now();

            try {
              // 1. Soft Delete Filter
              if (model && softDeleteModels.has(model)) {
                if (
                  [
                    'findUnique',
                    'findUniqueOrThrow',
                    'findFirst',
                    'findFirstOrThrow',
                    'findMany',
                    'count',
                    'aggregate',
                    'groupBy',
                  ].includes(operation)
                ) {
                  args.where = withSoftDeleteFilter(args.where ?? {});
                }
              }

              // 2. Tenant Isolation & Global Deletion Lock
              if (
                model &&
                multiTenantModels.has(model) &&
                tenantId &&
                !skipTenantCheck
              ) {
                // 🛡️ GLOBAL DELETION LOCK: Block mutations for deletion-pending tenants
                const isMutation = [
                  'create',
                  'createMany',
                  'update',
                  'updateMany',
                  'delete',
                  'deleteMany',
                  'upsert',
                ].includes(operation);

                if (isMutation) {
                  const tenant = await rootClient.tenant.findUnique({
                    where: { id: tenantId },
                    select: { deletionRequestPending: true },
                  });

                  if (tenant?.deletionRequestPending) {
                    throw new Error(
                      'TENANT_DELETION_PENDING: Mutations are blocked for accounts pending deletion.',
                    );
                  }
                }

                if (
                  [
                    'findUnique',
                    'findUniqueOrThrow',
                    'findFirst',
                    'findFirstOrThrow',
                    'findMany',
                    'count',
                    'aggregate',
                    'groupBy',
                    'update',
                    'updateMany',
                    'delete',
                    'deleteMany',
                  ].includes(operation)
                ) {
                  args.where = {
                    ...(args.where ?? {}),
                    tenantId,
                  };
                }

                if (['create', 'upsert', 'createMany'].includes(operation)) {
                  if (operation === 'create') {
                    args.data = { ...(args.data ?? {}), tenantId };
                  } else if (operation === 'createMany') {
                    if (Array.isArray(args.data)) {
                      args.data = args.data.map((item: any) => ({
                        ...item,
                        tenantId,
                      }));
                    } else if (args.data) {
                      args.data.tenantId = tenantId;
                    }
                  } else if (operation === 'upsert') {
                    args.create = { ...(args.create ?? {}), tenantId };
                    args.where = { ...(args.where ?? {}), tenantId };
                  }
                }
              }

              return await query(args);
            } finally {
              const duration = Date.now() - start;
              if (duration > 500) {
              }
            }
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
      throw new BadRequestException('Tenant context is missing');
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

    for (const user of users) {
      if (!user.tenantId || !user.role) {
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
    }
  }
}
