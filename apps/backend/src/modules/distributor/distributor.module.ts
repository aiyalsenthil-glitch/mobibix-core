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
import { DistributorCommissionListener } from './events/commission.listener';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { DistributorRegisterController } from './distributor.register.controller';
import { DistributorLinkingController, RetailerLinkingController } from './linking/linking.controller';
import { LinkingService } from './linking/linking.service';
import { DistributorStockController, RetailerStockController } from './stock/stock.controller';
import { StockService } from './stock/stock.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    CatalogController,
    RetailerCatalogController,
    OrdersController,
    RetailerOrdersController,
    AnalyticsController,
    DistributorRegisterController,
    DistributorLinkingController,
    RetailerLinkingController,
    DistributorStockController,
    RetailerStockController,
  ],
  providers: [
    CatalogService,
    OrdersService,
    AnalyticsService,
    LinkingService,
    StockService,
    DistributorAttributionListener,
    DistributorCommissionListener,
    DistributorScopeGuard,
  ],
  exports: [CatalogService, OrdersService, AnalyticsService, LinkingService, StockService],
})
export class DistributorModule {}
