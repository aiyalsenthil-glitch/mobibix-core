import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getCtx, setCtx } from '../cls/async-context';

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
}
