import { PrismaClient, PaymentMode, InvoiceStatus, InvoiceType, PurchaseStatus, ReceiptType, ReceiptStatus } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cmmf1d9rq0008levotuo1ydee';
  const shopId = 'cmmf1dbed000slevoyvirr5h4';

  console.log('🚀 SEEDING REPAIR BILLS & SUPPLIER INVOICES...');

  // Ensure a service product exists
  let serviceProduct = await prisma.shopProduct.findFirst({
      where: { tenantId, shopId, type: 'SERVICE' }
  });

  if (!serviceProduct) {
      serviceProduct = await prisma.shopProduct.create({
          data: {
              id: createId(),
              tenantId,
              shopId,
              name: 'General Repair Service',
              type: 'SERVICE',
              salePrice: 50000, // 500.00
              costPrice: 0,
              quantity: 0,
              gstRate: 18
          }
      });
  }

  // 1. Generate Repair Invoices for READY Job Cards
  const readyJobCards = await prisma.jobCard.findMany({
    where: {
      tenantId,
      shopId,
      status: 'READY',
      invoices: { none: {} }
    },
    take: 20,
    include: {
        parts: { include: { product: true } }
    }
  });

  console.log(`Found ${readyJobCards.length} READY job cards without invoices. Creating bills...`);

  for (const job of readyJobCards) {
    const invId = createId();
    const date = job.createdAt;
    
    // Calculate totals
    let subTotal = (job.laborCharge || 0) * 100;
    interface InvoiceItemData {
        id: string;
        invoiceId: string;
        shopProductId: string;
        quantity: number;
        rate: number;
        hsnCode: string;
        gstRate: number;
        gstAmount: number;
        lineTotal: number;
        costAtSale: number;
    }
    let items: InvoiceItemData[] = [];
    
    // Add Labor Item
    items.push({
        id: createId(),
        invoiceId: invId,
        shopProductId: serviceProduct.id,
        quantity: 1,
        rate: job.laborCharge || 500,
        hsnCode: '9987',
        gstRate: 18,
        gstAmount: Math.round(subTotal * 0.18),
        lineTotal: Math.round(subTotal * 1.18),
        costAtSale: 0
    });

    // Add Parts
    for (const part of job.parts) {
        if (!part.product) continue;
        const partPrice = (part.product.salePrice || 1000);
        const partCost = (part.product.costPrice || 800);
        items.push({
            id: createId(),
            invoiceId: invId,
            shopProductId: part.shopProductId,
            quantity: part.quantity,
            rate: Math.round(partPrice / 100),
            hsnCode: part.product.hsnCode || '8517',
            gstRate: 18,
            gstAmount: Math.round(partPrice * 0.18),
            lineTotal: Math.round(partPrice * 1.18),
            costAtSale: partCost
        });
        subTotal += partPrice;
    }

    const totalGst = Math.round(subTotal * 0.18);
    const totalAmount = subTotal + totalGst;

    await prisma.invoice.create({
      data: {
        id: invId,
        tenantId,
        shopId,
        customerId: job.customerId,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        invoiceNumber: `REPAIR-${Date.now()}-${invId.slice(-4)}`,
        invoiceDate: date,
        subTotal,
        gstAmount: totalGst,
        totalAmount,
        paidAmount: totalAmount,
        paymentMode: PaymentMode.CASH,
        status: InvoiceStatus.PAID,
        invoiceType: InvoiceType.REPAIR,
        jobCardId: job.id,
        items: {
          createMany: {
            data: items.map(it => ({
                shopProductId: it.shopProductId,
                quantity: it.quantity,
                rate: it.rate,
                hsnCode: it.hsnCode,
                gstRate: it.gstRate,
                gstAmount: it.gstAmount,
                lineTotal: it.lineTotal,
                costAtSale: it.costAtSale
            }))
          }
        },
        receipts: {
            create: {
                tenantId,
                shopId,
                receiptId: `REC-REPAIR-${invId.slice(-4)}`,
                printNumber: `P-${invId.slice(-4)}`,
                receiptType: ReceiptType.CUSTOMER,
                amount: totalAmount,
                paymentMethod: PaymentMode.CASH,
                customerName: job.customerName,
                status: ReceiptStatus.ACTIVE,
                createdAt: date
            }
        }
      }
    });
  }

  // 2. Generate Supplier Invoices (Purchases)
  const suppliers = await prisma.party.findMany({
    where: {
      tenantId,
      partyType: { in: ['VENDOR', 'BOTH'] }
    },
    take: 5
  });

  const products = await prisma.shopProduct.findMany({
    where: { shopId, type: 'GOODS' },
    take: 5
  });

  console.log(`Found ${suppliers.length} suppliers. Creating purchase invoices...`);

  for (const supplier of suppliers) {
    for (let i = 0; i < 3; i++) {
        const purchaseId = createId();
        const date = subDays(new Date(), Math.floor(Math.random() * 30));
        const prod = products[Math.floor(Math.random() * products.length)];
        
        if (!prod) continue;

        const qty = 10;
        const price = prod.costPrice || 4000;
        const subTotal = qty * price;
        const gst = Math.round(subTotal * 0.18);
        const grandTotal = subTotal + gst;

        await prisma.purchase.create({
            data: {
                id: purchaseId,
                tenantId,
                shopId,
                invoiceNumber: `PUR-${Date.now()}-${purchaseId.slice(-4)}`,
                globalSupplierId: supplier.id,
                supplierName: supplier.name,
                invoiceDate: date,
                subTotal,
                totalGst: gst,
                grandTotal,
                paidAmount: grandTotal,
                paymentMethod: PaymentMode.BANK,
                status: PurchaseStatus.PAID,
                items: {
                    create: {
                        shopProductId: prod.id,
                        description: prod.name,
                        quantity: qty,
                        purchasePrice: Math.round(price / 100),
                        gstRate: 18,
                        totalAmount: grandTotal
                    }
                },
                payments: {
                    create: {
                        tenantId,
                        shopId,
                        amount: grandTotal,
                        paymentMethod: PaymentMode.BANK,
                        paymentDate: date
                    }
                }
            }
        });
    }
  }

  console.log('✅ SEEDING COMPLETE!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
