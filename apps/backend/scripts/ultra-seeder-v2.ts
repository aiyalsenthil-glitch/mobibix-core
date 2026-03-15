
import { PrismaClient, PaymentMode, InvoiceStatus, InvoiceType, JobStatus, UserRole, PartyType, ProductType, ReceiptType, ReceiptStatus, LoyaltyTransactionType } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const tId = 'cmmf1d9rq0008levotuo1ydee';
  const uId = 'b71d1379-26a5-44ea-9816-792a92054b37';
  
  console.log('🚀 RECOVERY & ULTRA SEEDER V2: Restoring Aiyal Technologies...');

  // 0. Clean Old Data (Skipping due to FK issues, will just append)
  console.log('Skipping cleanup and starting seed...');
  /*
  await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId: tId } } });
  await prisma.receipt.deleteMany({ where: { tenantId: tId } });
  await prisma.loyaltyTransaction.deleteMany({ where: { tenantId: tId } });
  await prisma.invoice.deleteMany({ where: { tenantId: tId } });
  await prisma.jobCard.deleteMany({ where: { tenantId: tId } });
  */

  // 1. Ensure Tenant exists
  let tenant = await prisma.tenant.findUnique({ where: { id: tId } });
  if (!tenant) {
      console.log('Restoring Tenant...');
      tenant = await prisma.tenant.create({
          data: {
              id: tId,
              name: 'Aiyal Technologies',
              code: 'AIYAL-TECH',
              legalName: 'Aiyal Technologies Pvt Ltd',
              contactPhone: '9900000000',
              tenantType: 'MOBILE_SHOP' as any,
          }
      });
  }

  // 2. Ensure Shops exist (10)
  const existingShops = await prisma.shop.findMany({ where: { tenantId: tId } });
  if (existingShops.length < 10) {
      console.log(`Restoring ${10 - existingShops.length} shops...`);
      for (let i = existingShops.length; i < 10; i++) {
          await prisma.shop.create({
              data: {
                  tenantId: tId,
                  name: `Shop Branch ${i + 1}`,
                  phone: `99000000${i}`,
                  addressLine1: `Address Street ${i}`,
                  city: 'Salem',
                  pincode: '636001',
                  invoicePrefix: `BR${i + 1}`,
                  gstEnabled: true,
                  gstNumber: '33AAAAA0000A1Z5'
              }
          });
      }
  }
  const allShops = await prisma.shop.findMany({ where: { tenantId: tId } });
  const shopIds = allShops.map(s => s.id);

  // 3. Ensure User is linked
  console.log('Linking User...');
  const user = await prisma.user.findUnique({ where: { id: uId } });
  if (user) {
    await prisma.user.update({ where: { id: uId }, data: { tenantId: tId, role: UserRole.OWNER } });
    await prisma.userTenant.upsert({
        where: { userId_tenantId: { userId: uId, tenantId: tId } },
        update: { role: UserRole.OWNER, isSystemOwner: true },
        create: { userId: uId, tenantId: tId, role: UserRole.OWNER, isSystemOwner: true }
    });
  }

  // 4. Loyalty Config
  console.log('Configuring Loyalty...');
  for (const shopId of shopIds) {
      await prisma.loyaltyConfig.upsert({
          where: { shopId },
          update: { earnAmountPerPoint: 10000, pointValueInRupees: 1, isEnabled: true },
          create: { tenantId: tId, shopId, earnAmountPerPoint: 10000, pointValueInRupees: 1, isEnabled: true }
      });
  }

  // 4a. Staff (15)
  console.log('Creating Staff...');
  for (let i = 0; i < 15; i++) {
      const staffEmail = `staff${i+1}@aiyal.com`;
      let sUser = await prisma.user.findFirst({ where: { email: staffEmail } });
      if (!sUser) {
          sUser = await prisma.user.create({
              data: {
                  email: staffEmail,
                  fullName: `Staff Member ${i+1}`,
                  REMOVED_AUTH_PROVIDERUid: `staff-fb-${createId()}`, // Use unique ID to avoid collision
                  tenantId: tId,
                  role: UserRole.STAFF,
              }
          });
      }
      const shopId = shopIds[i % shopIds.length];
      await prisma.shopStaff.upsert({
          where: { userId_tenantId_shopId: { userId: sUser.id, tenantId: tId, shopId } },
          update: { isActive: true },
          create: { userId: sUser.id, tenantId: tId, shopId, role: UserRole.STAFF }
      });
  }

  // 5. Customers (1000)
  console.log('Creating Customers...');
  const existingCustCount = await prisma.party.count({ where: { tenantId: tId, partyType: PartyType.CUSTOMER } });
  if (existingCustCount < 1000) {
      const batch = Array.from({ length: 1000 - existingCustCount }).map((_, i) => {
          const phone = `910000${(existingCustCount + i).toString().padStart(4, '0')}`;
          return {
              id: createId(),
              tenantId: tId,
              name: `Customer ${existingCustCount + i + 1}`,
              phone,
              normalizedPhone: phone,
              partyType: PartyType.CUSTOMER,
              businessType: 'B2C' as any,
          };
      });
      await prisma.party.createMany({ data: batch });
  }
  const customers = await prisma.party.findMany({ where: { tenantId: tId, partyType: PartyType.CUSTOMER }, take: 1000 });

  // 6. Products (50 per shop)
  console.log('Creating Products...');
  const shopProductCache: Record<string, string> = {};
  for (const shopId of shopIds) {
      const pCount = await prisma.shopProduct.count({ where: { shopId } });
      if (pCount < 50) {
          const batch = Array.from({ length: 50 - pCount }).map((_, i) => ({
              id: createId(),
              tenantId: tId,
              shopId,
              name: `Product ${i + 1} (${shopId.slice(-4)})`,
              salePrice: 5000,
              costPrice: 4000,
              type: ProductType.GOODS,
              gstRate: 18,
              quantity: 1000,
          }));
          await prisma.shopProduct.createMany({ data: batch });
      }
      const firstProd = await prisma.shopProduct.findFirst({ where: { shopId } });
      if (firstProd) shopProductCache[shopId] = firstProd.id;
  }

  // 7. INVOICES (10,000 for now, scale to 1L later)
  console.log('Generating 10,000 Invoices with Receipts & Loyalty...');
  const BATCH_SIZE = 1000;
  const TOTAL = 100000;
  
  for (let b = 0; b < TOTAL; b += BATCH_SIZE) {
      const invoices: any[] = [];
      const invoiceItems: any[] = [];
      const receipts: any[] = [];
      const loyaltyTrans: any[] = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
          const shopId = shopIds[Math.floor(Math.random() * shopIds.length)];
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const invId = createId();
          const invDate = subDays(new Date(), Math.floor(Math.random() * 365));
          
          const subTotal = 15000;
          const gst = 2700;
          const total = 17700;

          invoices.push({
              id: invId,
              tenantId: tId,
              shopId,
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone,
              invoiceNumber: `RECOV-${Date.now()}-${b + i}`,
              invoiceDate: invDate,
              subTotal,
              gstAmount: gst,
              cgst: Math.round(gst/2),
              sgst: Math.round(gst/2),
              totalAmount: total,
              paidAmount: total,
              paymentMode: PaymentMode.UPI,
              status: InvoiceStatus.PAID,
          });

          receipts.push({
              id: createId(),
              tenantId: tId,
              shopId,
              receiptId: `REC-${Date.now()}-${b + i}`,
              printNumber: `P-${b + i}`,
              receiptType: ReceiptType.CUSTOMER,
              amount: total,
              paymentMethod: PaymentMode.UPI,
              customerId: customer.id,
              customerName: customer.name,
              linkedInvoiceId: invId,
              status: ReceiptStatus.ACTIVE,
              createdAt: invDate,
          });

          // Loyalty: 17700 / 100 = 177 points
          loyaltyTrans.push({
              id: createId(),
              tenantId: tId,
              shopId,
              customerId: customer.id,
              points: 177,
              type: LoyaltyTransactionType.EARN,
              source: 'INVOICE' as any,
              referenceId: invId,
              createdAt: invDate,
          });

          invoiceItems.push({
              id: createId(),
              invoiceId: invId,
              shopProductId: shopProductCache[shopId] || '',
              quantity: 3,
              rate: 5000,
              hsnCode: '8517',
              gstRate: 18,
              gstAmount: 2700,
              lineTotal: 15000,
          });
      }

      await prisma.invoice.createMany({ data: invoices });
      await prisma.receipt.createMany({ data: receipts });
      await prisma.loyaltyTransaction.createMany({ data: loyaltyTrans });
      await prisma.invoiceItem.createMany({ data: invoiceItems });
      console.log(`Pushed batch ${b + BATCH_SIZE}...`);
  }

  // 8. JobCards (10,000)
  console.log('Generating 10,000 JobCards...');
  for (let b = 0; b < TOTAL; b += BATCH_SIZE) {
      const jcs = Array.from({ length: BATCH_SIZE }).map((_, i) => {
          const shopId = shopIds[Math.floor(Math.random() * shopIds.length)];
          const customer = customers[Math.floor(Math.random() * customers.length)];
          const createdAt = subDays(new Date(), Math.floor(Math.random() * 365));
          return {
              tenantId: tId,
              shopId,
              customerId: customer.id,
              customerName: customer.name,
              customerPhone: customer.phone,
              jobNumber: `RE-JC-${Date.now()}-${b + i}`,
              publicToken: createId(),
              deviceType: 'Smartphone',
              deviceBrand: 'Apple',
              deviceModel: 'iPhone 13',
              customerComplaint: 'Wiped Data Recovery',
              status: JobStatus.READY,
              createdAt,
              createdByUserId: uId,
              createdByName: 'Test Owner',
          };
      });
      await prisma.jobCard.createMany({ data: jcs });
      console.log(`Pushed JobCards up to ${b + BATCH_SIZE}...`);
  }

  console.log('✅ RECOVERY SEEDER FINISHED!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
