import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UsersModule } from './users/users.module';
import { MembersModule } from './members/members.module';
import { BillingModule } from './billing/billing.module';
import { AuditModule } from './audit/audit.module';
import { PrismaModule } from './prisma/prisma.module';
import { StaffModule } from './staff/staff.module';
import { AdminModule } from './admin/admin.module';
import { CustomersModule } from './customers/customers.module';
import { PartiesModule } from './parties/parties.module';
import { ShopModule } from './shops/shop.module';
import { SalesModule } from './sales/sales.module';
import { PurchaseModule } from './purchase/purchase.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { HsnModule } from './hsn/hsn.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { CrmDashboardModule } from './crm-dashboard/crm-dashboard.module';
import { CommonModule } from '../common/common.module';
import { PlatformModule } from './platform/platform.module';
import { ReportsHardeningModule } from './reports/reports-hardening.module';



@Module({
  imports: [
    CommonModule,
    PrismaModule,
    AuthModule,
    TenantModule,
    UsersModule,
    MembersModule,
    BillingModule,
    AuditModule,
    StaffModule,
    AdminModule,
    CustomersModule,
    PartiesModule,
    ShopModule,
    SalesModule,
    PurchaseModule,
    InventoryModule,
    ProductsModule,
    StockModule,
    ReceiptsModule,
    HsnModule,
    FollowUpsModule,
    CrmDashboardModule,
    PlatformModule,
    ReportsHardeningModule,
  ],
  exports: [
    AuthModule,
    TenantModule,
    UsersModule,
    MembersModule,
    BillingModule,
    AuditModule,
    StaffModule,
    HsnModule,
  ],
})
export class CoreModule {}
