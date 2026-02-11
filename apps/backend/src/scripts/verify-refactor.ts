import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SalesService } from '../core/sales/sales.service';
import { RepairService } from '../modules/mobileshop/repair/repair.service';
import { StockService } from '../core/stock/stock.service';
import { PrismaService } from '../core/prisma/prisma.service';
import { BillingService } from '../core/sales/billing.service';
import { PaymentMode, ProductType, BillingCycle, ModuleType, SubscriptionStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

async function verify() {
  const logger = new Logger('VerificationScript');
  logger.log('Starting verification...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const salesService = app.get(SalesService);
  const repairService = app.get(RepairService);
  const stockService = app.get(StockService);
  const billingService = app.get(BillingService);

  // 1. Setup Data
  const timestamp = Date.now();
  const tenantCode = `test_${timestamp}`;
  logger.log(`Creating Tenant: ${tenantCode}`);
  
  const tenant = await prisma.tenant.create({
     data: {
         name: 'Test Tenant Refactor',
         code: tenantCode,
         tenantType: 'MOBILE_SHOP',
     }
  });

  const shop = await prisma.shop.create({
      data: {
          tenantId: tenant.id,
          name: 'Test Shop',
          phone: '9999999999',
          addressLine1: '123 Test St',
          city: 'Test City',
          state: 'Tamil Nadu', 
          pincode: '600001',
          gstEnabled: true,
          gstNumber: '33AAAAA0000A1Z5',
          invoicePrefix: 'INV',
      }
  });

  // Create Document Settings
  await prisma.shopDocumentSetting.createMany({
      data: [
          {
              shopId: shop.id,
              documentType: 'SALES_INVOICE',
              prefix: 'INV',
              documentCode: 'INV',
              currentNumber: 0,
              resetPolicy: 'YEARLY'
          },
          {
              shopId: shop.id,
              documentType: 'REPAIR_INVOICE',
              prefix: 'REP',
              documentCode: 'REP',
              currentNumber: 0,
              resetPolicy: 'YEARLY'
          },
             {
              shopId: shop.id,
              documentType: 'RECEIPT',
              prefix: 'REC',
              documentCode: 'REC',
              currentNumber: 0,
              resetPolicy: 'YEARLY'
          }
      ]
  });
  
  // Create Products
  const spareProduct = await prisma.shopProduct.create({
      data: {
          tenantId: tenant.id,
          shopId: shop.id,
          name: 'Test Screen',
          type: ProductType.SPARE, // Ensure this matches enum
          salePrice: 1000,
          costPrice: 500,
          isActive: true,
          isSerialized: false, // Bulk
          hsnCode: '8517',
      }
  });
  
  // Stock In (Opening Stock)
  await stockService.recordStockInBatch(
      tenant.id,
      shop.id,
      [{ productId: spareProduct.id, quantity: 10, costPerUnit: 500 }],
      'PURCHASE',
      null
  );
  
  logger.log('Data Setup Complete. Running Tests...');
  
  // 2. Test Sales Flow
  try {
      logger.log('Testing SalesService.createInvoice...');
      const invoice = await salesService.createInvoice(tenant.id, {
          shopId: shop.id,
          customerName: 'Test Customer',
          customerPhone: '9876543210',
          customerState: 'Tamil Nadu',
          items: [
              {
                  shopProductId: spareProduct.id,
                  quantity: 2,
                  rate: 1200, // Override price
                  gstRate: 18,
              }
          ],
          paymentMode: 'CASH' as PaymentMode, // Use string if enum issues, or typed
          pricesIncludeTax: false
      } as any); 
      
      logger.log(`Sales Invoice Created: ${invoice.invoiceNumber}, Total: ${invoice.totalAmount}`);
      
      // Verify Stock
      const stock = await stockService.getCurrentStock(spareProduct.id, tenant.id);
      if (stock !== 8) throw new Error(`Stock mismatch after sale. Expected 8, got ${stock}`);
      logger.log('Sales Stock Verified: 8');

      const ledgerAfterSale = await prisma.stockLedger.findMany({ where: { tenantId: tenant.id } });
      console.log('DEBUG: Ledger After Sale:', ledgerAfterSale);
      
  } catch (e) {
      logger.error('Sales Verification Failed', e);
      console.error(e);
  }

  // 3. Test Repair Flow
  try {
      logger.log('Testing RepairService...');
      
      // Create Job
      const jobNumber = `JOB-${timestamp}`;
      const job = await prisma.jobCard.create({
          data: {
              tenantId: tenant.id,
              shopId: shop.id,
              customerId: undefined, // Optional
              customerName: 'Repair Customer',
              customerPhone: '9988776655',
              jobNumber: jobNumber,
              publicToken: `token-${timestamp}`,
              deviceType: 'Mobile',
              deviceBrand: 'BrandX',
              deviceModel: 'Test Device',
              status: 'DIAGNOSING',
              customerComplaint: 'Broken Screen', // Correct field name
              estimatedCost: 2000,
              createdByUserId: 'sys_admin',
              createdByName: 'System Admin',
              createdAt: new Date(),
              updatedAt: new Date()
          }
      });
      
      // Stock Out for Repair
      logger.log(`Stock Out for Job ${job.id}`);
      await repairService.stockOutForRepair(tenant.id, {
          shopId: shop.id,
          jobCardId: job.id,
          items: [{ shopProductId: spareProduct.id, quantity: 1, costPerUnit: 500 }]
      } as any);
      
      // Debug: Log all ledger entries
      const allLedger = await prisma.stockLedger.findMany({ where: { tenantId: tenant.id } });
      console.log('DEBUG: StockLedger Entries:', allLedger);

      // Verify Stock
      const stockAfterRepairOut = await stockService.getCurrentStock(spareProduct.id, tenant.id);
      if (stockAfterRepairOut !== 7) throw new Error(`Stock mismatch after repair out. Expected 7, got ${stockAfterRepairOut}`);
      logger.log('Repair Stock Out Verified: 7');
      
      // Update Job to READY
      await prisma.jobCard.update({ where: { id: job.id }, data: { status: 'READY' } });
      
      // Generate Bill
      logger.log('Generating Repair Bill...');
      const bill = await repairService.generateRepairBill(tenant.id, {
          shopId: shop.id,
          jobCardId: job.id,
          billingMode: 'WITH_GST', // BillingMode enum?
          serviceGstRate: 18,
          paymentMode: 'CASH' as PaymentMode,
          pricesIncludeTax: false,
          services: [
              { description: 'Screen Replacement Labor', amount: 500 }
          ],
          parts: [
              { shopProductId: spareProduct.id, quantity: 1, rate: 1000, gstRate: 18 }
          ]
      } as any);
      
      logger.log(`Repair Bill Generated: ${bill.invoiceNumber}, Total: ${bill.totalAmount}`);
      
      // Verify Job Status
      const updatedJob = await prisma.jobCard.findUnique({ where: { id: job.id } });
      if (updatedJob?.status !== 'DELIVERED') throw new Error('Job status is not DELIVERED');
      logger.log('Job Status Verified: DELIVERED');

  } catch (e) {
      logger.error('Repair Verification Failed', e);
      console.error(e);
  }
  
  await app.close();
}

verify();
