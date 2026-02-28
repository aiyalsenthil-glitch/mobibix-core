import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { JobCardsService } from './src/modules/mobileshop/jobcard/job-cards.service';
import { PrismaService } from './src/core/prisma/prisma.service';
import { UsersService } from './src/core/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const jobService = app.get(JobCardsService);
  const usersService = app.get(UsersService);

  try {
    let tenant = await prisma.tenant.findFirst({ where: { name: 'JobCard Test Tenant' } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'JobCard Test Tenant',
          code: 'JC-' + Date.now(),
          legalName: 'JC Corp',
          contactPhone: '0000',
          tenantType: 'MOBILE_SHOP'
        }
      });
    }

    let shop = await prisma.shop.findFirst({ where: { tenantId: tenant.id } });
    if (!shop) {
      shop = await prisma.shop.create({
        data: {
          tenantId: tenant.id,
          name: 'JC Test Shop',
          phone: '000',
          addressLine1: 'Test',
          city: 'Test',
          state: 'Test',
          pincode: '000',
          invoicePrefix: 'JCINV-',
          isActive: true
        }
      });
      await prisma.shopDocumentSetting.create({
        data: {
          shopId: shop.id,
          documentType: 'SALES_INVOICE',
          prefix: 'INV',
          documentCode: 'INV',
        }
      });
    }

    let user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          REMOVED_AUTH_PROVIDERUid: `mock-${Date.now()}`,
          email: `test-${Date.now()}@jobcard.com`,
          fullName: 'Test User',
          role: 'OWNER'
        }
      });
    }

    const mockUser = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: 'OWNER'
    };

    console.log(`\n\n--- 🚀 RUNNING JOBCARD ARCHITECTURE VERIFICATION ---`);
    console.log(`Using Shop: ${shop.name} (${shop.id})`);

    // 1️⃣ CREATE A NEW JOBCARD
    const createdJob = await jobService.create(mockUser, shop.id, {
      customerName: 'Test Scrapped Flow',
      customerPhone: '9998887776',
      deviceType: 'Mobile',
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 13',
      customerComplaint: 'Broken screen and battery dead',
      estimatedCost: 8000
    });
    console.log(`✅ Job Created: ${createdJob.jobNumber}`);

    // 2️⃣ ADD LABOR CHARGE AND TRANSITION TO READY (Triggers Auto-Invoicing)
    console.log(`\n--- ⏳ Moving to IN_PROGRESS then READY with Labor Charge ---`);
    await jobService.updateStatus(mockUser, shop.id, createdJob.id, 'DIAGNOSING');
    await jobService.updateStatus(mockUser, shop.id, createdJob.id, 'IN_PROGRESS');
    
    await jobService.update(mockUser, shop.id, createdJob.id, {
      laborCharge: 1500 // Adding Explicit Labor Charge
    });

    const readyJob = await jobService.updateStatus(mockUser, shop.id, createdJob.id, 'READY');
    
    // Auto-invoicing is disabled by status config, so we manually trigger it to test the explicitly updated laborCharge calculation
    const jobWithParts = await prisma.jobCard.findFirst({ where: { id: createdJob.id }, include: { shop: true, parts: { include: { product: true } } } });
    await (jobService as any).handleJobReady(jobWithParts, mockUser);

    console.log(`✅ Job Marked READY & Invoiced`);

    // 3️⃣ VERIFY INVOICE LABOR EXPLICIT COMPUTATION
    const invoice = await prisma.invoice.findFirst({
      where: { jobCardId: createdJob.id },
      include: { items: { include: { product: true } } }
    });

    console.log(`\n--- 🧾 INVOICE VERIFICATION ---`);
    if (invoice && invoice.items.length === 1 && invoice.items[0].product.name === 'Repair Service') {
      console.log(`✅ Invoice successfully generated: ${invoice.invoiceNumber}`);
      console.log(`✅ Service Line Item Amount: ₹${invoice.items[0].lineTotal / 100}`);
      if (invoice.items[0].lineTotal === 150000) { // 1500 * 100 paisa
        console.log(`🟢 PASS: Explicit Labor Charge perfectly maps to Invoice Total`);
      } else {
        console.error(`🔴 FAIL: Invoice Total mismatch. Expected 150000, got ${invoice.items[0].lineTotal}`);
      }
    } else {
      console.error(`🔴 FAIL: Invoice generation anomaly`, invoice);
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID' }
    });

    // 4️⃣ TRANSITION TO DELIVERED AND VERIFY DELIVERED_AT ANCHOR
    console.log(`\n--- 📦 DELIVERY & TIMESTAMP VERIFICATION ---`);
    const deliveredJob = await jobService.updateStatus(mockUser, shop.id, createdJob.id, 'DELIVERED');
    if (deliveredJob.deliveredAt) {
      console.log(`✅ Job Delivered.`);
      console.log(`🟢 PASS: deliveredAt timestamp explicitly minted -> ${deliveredJob.deliveredAt}`);
    } else {
      console.error(`🔴 FAIL: deliveredAt is null after DELIVERED status mapping.`);
    }

    // 5️⃣ VERIFY SCRAPPED FLOW ON A SECOND JOB
    console.log(`\n--- 🗑️ SCRAPPED FLOW VERIFICATION ---`);
    const scrapJob = await jobService.create(mockUser, shop.id, {
      customerName: 'Test Scrapped Abandon',
      customerPhone: '1112223334',
      deviceType: 'Laptop',
      deviceBrand: 'Dell',
      deviceModel: 'XPS',
      customerComplaint: 'Motherboard shorted',
    });
    
    await jobService.updateStatus(mockUser, shop.id, scrapJob.id, 'DIAGNOSING');
    await jobService.updateStatus(mockUser, shop.id, scrapJob.id, 'IN_PROGRESS');
    const scrappedJob = await jobService.updateStatus(mockUser, shop.id, scrapJob.id, 'SCRAPPED');
    
    if (scrappedJob.scrappedAt) {
      console.log(`✅ Job Marked SCRAPPED.`);
      console.log(`🟢 PASS: scrappedAt timestamp explicitly minted -> ${scrappedJob.scrappedAt}`);
    } else {
      console.error(`🔴 FAIL: scrappedAt is null after SCRAPPED status mapping.`);
    }

    console.log(`\n✅ TEST COMPLETE`);

  } catch (err) {
    console.error('\n💥 TEST FAILED WITH EXCEPTION:', err.message);
    if(err.response) { console.error(err.response); }
  } finally {
    await prisma.$disconnect();
    await app.close();
  }
}

bootstrap();
