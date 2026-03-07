
import { PrismaClient, PaymentMode, InvoiceStatus, InvoiceType, JobStatus } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmf1d9rq0008levotuo1ydee';
  
  console.log('🚀 UNLEASHING ULTRA SEEDER: Goal 100,000 Invoices');

  const shops = await prisma.shop.findMany({ where: { tenantId } });
  const customers = await prisma.party.findMany({ where: { tenantId, partyType: 'CUSTOMER' as any } });
  
  if (shops.length === 0 || customers.length === 0) {
      console.error('Run heavy-seeder.ts first!');
      return;
  }

  const shopIds = shops.map(s => s.id);
  const customerIds = customers.map(c => c.id);

  // Prefetch products for each shop
  const productsByShop: Record<string, any[]> = {};
  for (const shopId of shopIds) {
      productsByShop[shopId] = await prisma.shopProduct.findMany({ where: { shopId } });
  }

  const TOTAL_INVOICES = 100000; // REACH 1L TARGET
  const BATCH_SIZE = 5000;
  
  for (let b = 0; b < TOTAL_INVOICES; b += BATCH_SIZE) {
      console.log(`Generating batch ${b} to ${b + BATCH_SIZE}...`);
      
      const invoices: any[] = [];
      const invoiceItems: any[] = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
          const shopId = shopIds[Math.floor(Math.random() * shopIds.length)];
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const products = productsByShop[shopId];
          const invoiceId = createId();
          const invoiceDate = subDays(new Date(), Math.floor(Math.random() * 365));
          
          const itemsToPick = products.slice(0, 3);
          const subTotal = itemsToPick.reduce((acc, p) => acc + (p.salePrice || 0), 0);
          const gstAmount = Math.round(subTotal * 0.18);
          const totalAmount = subTotal + gstAmount;

          invoices.push({
              id: invoiceId,
              tenantId,
              shopId,
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone,
              customerGstin: customer.gstNumber,
              customerState: customer.state || 'Tamil Nadu',
              invoiceNumber: `LAKH-${Date.now()}-${b + i}`,
              invoiceDate,
              subTotal,
              gstAmount,
              cgst: Math.round(gstAmount / 2),
              sgst: Math.round(gstAmount / 2),
              totalAmount,
              paidAmount: totalAmount,
              paymentMode: PaymentMode.UPI,
              status: InvoiceStatus.PAID,
              invoiceType: InvoiceType.SALES,
          });

          itemsToPick.forEach(p => {
              const itemGst = Math.round((p.salePrice || 0) * 0.18);
              invoiceItems.push({
                  id: createId(),
                  invoiceId,
                  shopProductId: p.id,
                  quantity: 1,
                  rate: p.salePrice || 0,
                  hsnCode: p.hsnCode || '8517',
                  gstRate: p.gstRate || 18,
                  gstAmount: itemGst,
                  cgstAmount: Math.round(itemGst / 2),
                  sgstAmount: Math.round(itemGst / 2),
                  lineTotal: (p.salePrice || 0) + itemGst,
              });
          });
      }

      console.log('Pushing batch to DB...');
      await prisma.invoice.createMany({ data: invoices });
      await prisma.invoiceItem.createMany({ data: invoiceItems });
  }

  console.log('✅ ULTRA SEEDER FINISHED 100,000 INVOICES');

  console.log('🚀 Generating 100,000 JobCards in bulk...');
  const TOTAL_JCS = 100000;
  for (let b = 0; b < TOTAL_JCS; b += BATCH_SIZE) {
      const jobCards: any[] = [];
      const count = Math.min(BATCH_SIZE, TOTAL_JCS - b);
      for (let i = 0; i < count; i++) {
          const shopId = shopIds[Math.floor(Math.random() * shopIds.length)];
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const createdAt = subDays(new Date(), Math.floor(Math.random() * 365));
          jobCards.push({
              id: createId(),
              tenantId,
              shopId,
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone || '9999999999',
              jobNumber: `LAKH-JC-${Date.now()}-${b + i}`,
              publicToken: createId(),
              deviceType: 'Smartphone',
              deviceBrand: 'Apple',
              deviceModel: 'iPhone 13',
              customerComplaint: 'Bulk Load Test',
              status: JobStatus.READY,
              createdByUserId: 'test-user',
              createdByName: 'System Ultra',
              createdAt,
          });
      }
      await prisma.jobCard.createMany({ data: jobCards });
      console.log(`Generated jobcards up to ${b + count}...`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
