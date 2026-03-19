import { Module } from '@nestjs/common';
import { CatalogController } from './catalog/catalog.controller';
import { RetailerCatalogController } from './catalog/retailer-catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { OrdersController, RetailerOrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { DistributorScopeGuard } from './guards/distributor-scope.guard';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { DistributorAttributionListener } from './events/attribution.listener';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { DistributorRegisterController } from './distributor.register.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    CatalogController,
    RetailerCatalogController,
    OrdersController,
    RetailerOrdersController,
    AnalyticsController,
    DistributorRegisterController,
  ],
  providers: [
    CatalogService,
    OrdersService,
    AnalyticsService,
    DistributorAttributionListener,
    DistributorScopeGuard,
  ],
  exports: [CatalogService, OrdersService, AnalyticsService],
})
export class DistributorModule {}
