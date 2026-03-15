
import { PrismaClient, UserRole, InvoiceStatus, JobStatus, PaymentMode, InvoiceType, StaffInviteStatus, ProductType, PartyType } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { subDays, addMinutes, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmf1d9rq0008levotuo1ydee'; // Detailed from previous command
  const userId = 'b71d1379-26a5-44ea-9816-792a92054b37'; // test@gmail.com
  
  console.log('🚀 Starting Massive Data Generation for Tenant:', tenantId);

  // 1. Ensure multiple shops (10)
  const existingShops = await prisma.shop.findMany({ where: { tenantId } });
  const shopsToCreate = 10 - existingShops.length;
  if (shopsToCreate > 0) {
    console.log(`Creating ${shopsToCreate} additional shops...`);
    for (let i = 0; i < shopsToCreate; i++) {
        await prisma.shop.create({
            data: {
                tenantId,
                name: `Shop Branch ${existingShops.length + i + 1}`,
                phone: `99000000${existingShops.length + i}`,
                addressLine1: `Address Street ${existingShops.length + i}`,
                city: 'Salem',
                pincode: '636001',
                invoicePrefix: `BR${existingShops.length + i + 1}`,
                gstEnabled: true,
                gstNumber: '33AAAAA0000A1Z5'
            }
        });
    }
  }
  const allShops = await prisma.shop.findMany({ where: { tenantId } });
  const shopIds = allShops.map(s => s.id);

  // 2. Loyalty Points Setup
  console.log('Enabling Loyalty Points (100 = 1 point)...');
  for (const shopId of shopIds) {
    await prisma.loyaltyConfig.upsert({
      where: { shopId },
      update: {
        earnAmountPerPoint: 10000, // 100 * 100 paise
        pointValueInRupees: 1,
        isEnabled: true,
      },
      create: {
        shopId,
        tenantId,
        earnAmountPerPoint: 10000,
        pointValueInRupees: 1,
        isEnabled: true,
      }
    });
  }

  // 3. Create Staff Invites (15)
  console.log('Ensuring 15 Staff Invites...');
  const existingInvites = await prisma.staffInvite.count({ where: { tenantId } });
  if (existingInvites < 15) {
      const invites = Array.from({ length: 15 - existingInvites }).map((_, i) => ({
        tenantId,
        email: `staff${existingInvites + i + 1}@aiyal.com`,
        name: `Staff Member ${existingInvites + i + 1}`,
        status: StaffInviteStatus.PENDING,
        role: UserRole.STAFF,
      }));
      await prisma.staffInvite.createMany({ data: invites });
  }

  // 4. Create Customers (1000)
  console.log('Creating Customers (1000)...');
  const existingCustomers = await prisma.party.count({ where: { tenantId, partyType: PartyType.CUSTOMER } });
  if (existingCustomers < 1000) {
      const customersToCreate = 1000 - existingCustomers;
      console.log(`Adding ${customersToCreate} customers...`);
      // Batch creation to avoid large transaction issues
      const batchSize = 100;
      for (let i = 0; i < customersToCreate; i += batchSize) {
          const batch = Array.from({ length: Math.min(batchSize, customersToCreate - i) }).map((_, idx) => {
              const phone = `910000${(existingCustomers + i + idx).toString().padStart(4, '0')}`;
              return {
                id: createId(),
                tenantId,
                name: `Customer ${existingCustomers + i + idx + 1}`,
                phone,
                normalizedPhone: phone,
                partyType: PartyType.CUSTOMER,
                businessType: 'B2C' as any,
              };
          });
          await prisma.party.createMany({ data: batch });
      }
  }
  const allCustomers = await prisma.party.findMany({ where: { tenantId, partyType: PartyType.CUSTOMER }, take: 1000 });

  // 5. Create Suppliers (50)
  console.log('Creating Suppliers (50)...');
  const existingSuppliers = await prisma.party.count({ where: { tenantId, partyType: PartyType.VENDOR } });
  if (existingSuppliers < 50) {
      const suppliersToCreate = 50 - existingSuppliers;
      const batch = Array.from({ length: suppliersToCreate }).map((_, idx) => {
          const phone = `980000${(existingSuppliers + idx).toString().padStart(4, '0')}`;
          return {
            id: createId(),
            tenantId,
            name: `Supplier ${existingSuppliers + idx + 1}`,
            phone,
            normalizedPhone: phone,
            partyType: PartyType.VENDOR,
            businessType: 'B2B' as any,
            gstNumber: '33BBBBB0000B1Z5'
          };
      });
      await prisma.party.createMany({ data: batch });
  }
  const allSuppliers = await prisma.party.findMany({ where: { tenantId, partyType: PartyType.VENDOR } });

  // 6. Create Products for each shop (50 per shop)
  console.log('Creating Products (50 per shop)...');
  for (const shopId of shopIds) {
      const existingProducts = await prisma.shopProduct.count({ where: { shopId } });
      if (existingProducts < 50) {
          const productsToCreate = 50 - existingProducts;
          const batch = Array.from({ length: productsToCreate }).map((_, idx) => ({
              id: createId(),
              tenantId,
              shopId,
              name: `Product ${idx + 1} Shop ${shopId.slice(-4)}`,
              salePrice: (idx + 1) * 500,
              costPrice: (idx + 1) * 400,
              type: ProductType.GOODS,
              gstRate: 18,
              category: 'General',
              quantity: 1000, // Pre-fill stock for testing
          }));
          await prisma.shopProduct.createMany({ data: batch });
      }
  }

  // 7. Generate 1000 Invoices (Last 1 year)
  console.log('Generating 1000 Invoices...');
  const existingInvoices = await prisma.invoice.count({ where: { tenantId } });
  if (existingInvoices < 1000) {
      const invoicesToCreate = 1000 - existingInvoices;
      const batchSize = 100;
      for (let i = 0; i < invoicesToCreate; i += batchSize) {
          console.log(`Processing invoice batch ${i/batchSize + 1}...`);
          const count = Math.min(batchSize, invoicesToCreate - i);
          
          for (let j = 0; j < count; j++) {
              const shopId = shopIds[Math.floor(Math.random() * shopIds.length)];
              const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
              const shopProducts = await prisma.shopProduct.findMany({ where: { shopId }, take: 5 });
              const invoiceDate = subDays(new Date(), Math.floor(Math.random() * 365));
              
              const subTotal = shopProducts.reduce((acc, p) => acc + (p.salePrice || 0), 0);
              const gstAmount = Math.round(subTotal * 0.18);
              const totalAmount = subTotal + gstAmount;

              const invoiceId = createId();
              await prisma.invoice.create({
                  data: {
                      id: invoiceId,
                      tenantId,
                      shopId,
                      customerId: customer.id,
                      customerName: customer.name,
                      customerPhone: customer.phone,
                      invoiceNumber: `INV-${Date.now()}-${i + j}`,
                      invoiceDate,
                      subTotal,
                      gstAmount,
                      totalAmount,
                      paidAmount: totalAmount,
                      paymentMode: PaymentMode.UPI,
                      status: InvoiceStatus.PAID,
                      invoiceType: InvoiceType.SALES,
                      items: {
                          create: shopProducts.map(p => ({
                              shopProductId: p.id,
                              quantity: 1,
                              rate: p.salePrice || 0,
                              hsnCode: '8517',
                              gstRate: 18,
                              gstAmount: Math.round((p.salePrice || 0) * 0.18),
                              lineTotal: (p.salePrice || 0) + Math.round((p.salePrice || 0) * 0.18),
                          }))
                      }
                  }
              });
          }
      }
  }

  // 8. Generate 1000 JobCards (Last 1 year)
  console.log('Generating 1000 JobCards...');
  const existingJobCards = await prisma.jobCard.count({ where: { tenantId } });
  if (existingJobCards < 1000) {
      const jcToCreate = 1000 - existingJobCards;
      const batchSize = 200;
      for (let i = 0; i < jcToCreate; i += batchSize) {
          const count = Math.min(batchSize, jcToCreate - i);
          const batch = Array.from({ length: count }).map((_, idx) => {
              const shopId = shopIds[Math.floor(Math.random() * shopIds.length)];
              const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
              const createdAt = subDays(new Date(), Math.floor(Math.random() * 365));
              return {
                  tenantId,
                  shopId,
                  customerId: customer.id,
                  customerName: customer.name,
                  customerPhone: customer.phone || '9999999999',
                  jobNumber: `JC-${Date.now()}-${i + idx}`,
                  publicToken: createId(),
                  deviceType: 'Smartphone',
                  deviceBrand: 'Apple',
                  deviceModel: 'iPhone 13',
                  customerComplaint: 'Screen Broken',
                  status: JobStatus.READY,
                  createdByUserId: userId,
                  createdByName: 'Test User',
                  createdAt,
              };
          });
          await prisma.jobCard.createMany({ data: batch });
      }
  }

  // 9. Create Supplier Invoices (Purchases) (100)
  console.log('Creating 100 Purchases...');
  const existingPurchases = await prisma.purchase.count({ where: { tenantId } });
  if (existingPurchases < 100) {
      const pToCreate = 100 - existingPurchases;
      for (let i = 0; i < pToCreate; i++) {
          const shopId = shopIds[Math.floor(Math.random() * shopIds.length)];
          const supplier = allSuppliers[Math.floor(Math.random() * allSuppliers.length)];
          const shopProducts = await prisma.shopProduct.findMany({ where: { shopId }, take: 3 });
          
          const subTotal = shopProducts.reduce((acc, p) => acc + (p.costPrice || 0), 0);
          const totalGst = Math.round(subTotal * 0.18);
          const grandTotal = subTotal + totalGst;

          await prisma.purchase.create({
              data: {
                  tenantId,
                  shopId,
                  invoiceNumber: `PUR-INV-${Date.now()}-${i}`,
                  globalSupplierId: supplier.id,
                  supplierName: supplier.name,
                  supplierGstin: supplier.gstNumber,
                  invoiceDate: subDays(new Date(), Math.floor(Math.random() * 30)),
                  subTotal,
                  totalGst,
                  grandTotal,
                  paidAmount: grandTotal,
                  paymentMethod: PaymentMode.BANK,
                  status: 'VERIFIED' as any,
                  items: {
                      create: shopProducts.map(p => ({
                          shopProductId: p.id,
                          description: p.name,
                          quantity: 10,
                          purchasePrice: p.costPrice || 0,
                          gstRate: 18,
                          totalAmount: (p.costPrice || 0) * 10 * 1.18,
                      }))
                  }
              }
          });
      }
  }

  console.log('✅ Data Generation Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
