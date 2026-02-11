import { Module } from '@nestjs/common';
import { MobileShopReportsController } from './reports.controller';
import { MobileShopReportsService } from './reports.service';
import { TaxCalculationService } from '../services/tax-calculation.service';
import { InvoicePaymentService } from '../services/invoice-payment.service';
import { GSTReportsService } from '../services/gst-reports.service';
import { PurchasePaymentService } from '../services/purchase-payment.service';
import { ReceivablesAgingService } from '../services/receivables-aging.service';
import { WarrantyService } from '../services/warranty.service';
import { DailySalesReportService } from '../services/daily-sales-report.service';

@Module({
  controllers: [MobileShopReportsController],
  providers: [
    MobileShopReportsService,
    TaxCalculationService,
    InvoicePaymentService,
    GSTReportsService,
    PurchasePaymentService,
    ReceivablesAgingService,
    WarrantyService,
    DailySalesReportService,
  ],
  exports: [
    MobileShopReportsService,
    TaxCalculationService,
    InvoicePaymentService,
    GSTReportsService,
    PurchasePaymentService,
    ReceivablesAgingService,
    WarrantyService,
    DailySalesReportService,
  ],
})
export class MobileShopReportsModule {}
