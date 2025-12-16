import { Injectable, Scope } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable({ scope: Scope.REQUEST })
export class PrismaService extends PrismaClient {
  private tenantId: string | null = null;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const adapter = new PrismaPg({ connectionString });

    super({
      adapter,
    });
  }

  setTenantId(tenantId: string) {
    this.tenantId = tenantId;
  }

  /** 🔒 Enforced tenant filter helper */
  tenantWhere<T extends object>(where?: T): T {
    if (!this.tenantId) {
      throw new Error('Tenant context is missing');
    }
    return {
      ...(where ?? {}),
      tenantId: this.tenantId,
    } as T;
  }
  // Add this method alongside tenantWhere():
  tenantWhereOptional<T extends object>(where?: T): T | { tenantId: null } {
    if (!this.tenantId) {
      return {} as T; // Skip filtering, or return empty
    }
    return {
      ...(where ?? {}),
      tenantId: this.tenantId,
    } as T;
  }
  getTenantId() {
    return this.tenantId;
  }
}
