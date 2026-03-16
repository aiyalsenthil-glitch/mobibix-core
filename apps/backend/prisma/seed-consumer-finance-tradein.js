/**
 * Seed: Consumer Finance + Trade-In demo data for test@gmail.com
 *
 * Tenant : cmmq3ijhj000otvykbu1xmpu7
 * Shop   : cmmq3il6l0016tvyko98q9xcp
 *
 * Run:
 *   node prisma/seed-consumer-finance-tradein.js
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

const TENANT_ID = 'cmmq3ijhj000otvykbu1xmpu7';
const SHOP_ID   = 'cmmq3il6l0016tvyko98q9xcp';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function paisa(rupees) { return Math.round(rupees * 100); }
function monthsFromNow(n) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 Seeding Consumer Finance + Trade-In data for test@gmail.com...\n');

  // 1. Find or create a demo customer (Party)
  let customer = await prisma.party.findFirst({
    where: { tenantId: TENANT_ID, phone: '9876543210' },
  });
  if (!customer) {
    customer = await prisma.party.create({
      data: {
        id: uuidv4(),
        tenantId: TENANT_ID,
        name: 'Rahul Sharma',
        phone: '9876543210',
        normalizedPhone: '9876543210',
        partyType: 'CUSTOMER',
      },
    });
    console.log('✅ Created demo customer:', customer.name);
  } else {
    console.log('ℹ️  Using existing customer:', customer.name);
  }

  // 2. Find a recent invoice to link finance records
  // (Uses any existing invoice in this shop — creates mock IDs if none)
  const invoice = await prisma.invoice.findFirst({
    where: { tenantId: TENANT_ID, shopId: SHOP_ID, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, invoiceNumber: true },
  });

  // ─── EMI Applications ─────────────────────────────────────────────────────

  // Check/create 3 demo EMI applications (each linked to unique fake invoice IDs)
  const emiRecords = [
    {
      id: 'demo-emi-001',
      invoiceId: invoice ? invoice.id : 'demo-invoice-emi-001',
      emiNumber: 'EMI-0001',
      financeProvider: 'Bajaj Finserv',
      applicationRef: 'BFPL-2026-00142',
      loanAmount: paisa(35000),
      downPayment: paisa(5000),
      tenureMonths: 12,
      monthlyEmi: paisa(2917),
      interestRate: 0,
      subventionAmount: paisa(1200),
      status: 'APPROVED',
      notes: 'Customer opted for 0% EMI scheme',
      createdBy: TENANT_ID,
    },
    {
      id: 'demo-emi-002',
      invoiceId: 'demo-invoice-emi-002',
      emiNumber: 'EMI-0002',
      financeProvider: 'Home Credit',
      applicationRef: null,
      loanAmount: paisa(20000),
      downPayment: paisa(2000),
      tenureMonths: 6,
      monthlyEmi: paisa(3000),
      interestRate: 14,
      subventionAmount: 0,
      status: 'APPLIED',
      notes: 'Pending bank verification',
      createdBy: TENANT_ID,
    },
    {
      id: 'demo-emi-003',
      invoiceId: 'demo-invoice-emi-003',
      emiNumber: 'EMI-0003',
      financeProvider: 'Bajaj Finserv',
      applicationRef: 'BFPL-2026-00098',
      loanAmount: paisa(50000),
      downPayment: paisa(10000),
      tenureMonths: 18,
      monthlyEmi: paisa(2222),
      interestRate: 0,
      subventionAmount: paisa(2000),
      status: 'SETTLED',
      settlementAmount: paisa(49800),
      settledAt: daysAgo(5),
      notes: 'Settled — amount adjusted by ₹200 processing fee',
      createdBy: TENANT_ID,
    },
  ];

  for (const emi of emiRecords) {
    const existing = await prisma.emiApplication.findUnique({
      where: { invoiceId: emi.invoiceId },
    }).catch(() => null);

    if (!existing) {
      // Skip FK check for demo invoice IDs — only upsert by invoiceId uniqueness
      try {
        await prisma.emiApplication.create({
          data: {
            ...emi,
            tenantId: TENANT_ID,
            shopId: SHOP_ID,
            customerId: customer.id,
            createdAt: daysAgo(Math.floor(Math.random() * 20) + 1),
            updatedAt: new Date(),
          },
        });
        console.log(`✅ EMI created: ${emi.emiNumber} (${emi.financeProvider}) — ${emi.status}`);
      } catch (e) {
        console.log(`⚠️  EMI ${emi.emiNumber} skipped (invoice FK not found): ${e.message}`);
      }
    } else {
      console.log(`ℹ️  EMI ${emi.emiNumber} already exists`);
    }
  }

  // ─── Installment Plans ────────────────────────────────────────────────────

  const planId1 = 'demo-plan-001';
  const planId2 = 'demo-plan-002';

  const plans = [
    {
      id: planId1,
      invoiceId: 'demo-invoice-plan-001',
      planNumber: 'KIS-0001',
      totalAmount: paisa(18000),
      downPayment: paisa(3000),
      remainingAmount: paisa(9000), // 2 of 5 slots paid
      tenureMonths: 5,
      monthlyAmount: paisa(3000),
      startDate: daysAgo(60),
      status: 'ACTIVE',
      notes: 'Regular customer — good payment history',
      slotsData: [
        { slotNumber: 1, dueDate: daysAgo(60), amount: paisa(3000), paidAmount: paisa(3000), status: 'PAID', paidAt: daysAgo(58) },
        { slotNumber: 2, dueDate: daysAgo(30), amount: paisa(3000), paidAmount: paisa(3000), status: 'PAID', paidAt: daysAgo(29) },
        { slotNumber: 3, dueDate: new Date(),   amount: paisa(3000), paidAmount: 0, status: 'PENDING' },
        { slotNumber: 4, dueDate: monthsFromNow(1), amount: paisa(3000), paidAmount: 0, status: 'PENDING' },
        { slotNumber: 5, dueDate: monthsFromNow(2), amount: paisa(3000), paidAmount: 0, status: 'PENDING' },
      ],
    },
    {
      id: planId2,
      invoiceId: 'demo-invoice-plan-002',
      planNumber: 'KIS-0002',
      totalAmount: paisa(24000),
      downPayment: paisa(4000),
      remainingAmount: paisa(20000),
      tenureMonths: 4,
      monthlyAmount: paisa(5000),
      startDate: daysAgo(5),
      status: 'ACTIVE',
      notes: 'New customer for Galaxy A55',
      slotsData: [
        { slotNumber: 1, dueDate: monthsFromNow(1), amount: paisa(5000), paidAmount: 0, status: 'PENDING' },
        { slotNumber: 2, dueDate: monthsFromNow(2), amount: paisa(5000), paidAmount: 0, status: 'PENDING' },
        { slotNumber: 3, dueDate: monthsFromNow(3), amount: paisa(5000), paidAmount: 0, status: 'PENDING' },
        { slotNumber: 4, dueDate: monthsFromNow(4), amount: paisa(5000), paidAmount: 0, status: 'PENDING' },
      ],
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.installmentPlan.findUnique({
      where: { invoiceId: plan.invoiceId },
    }).catch(() => null);

    if (!existing) {
      const { slotsData, ...planData } = plan;
      try {
        await prisma.installmentPlan.create({
          data: {
            ...planData,
            tenantId: TENANT_ID,
            shopId: SHOP_ID,
            customerId: customer.id,
            createdBy: TENANT_ID,
            createdAt: plan.startDate,
            updatedAt: new Date(),
            slots: {
              create: slotsData.map((s) => ({
                id: uuidv4(),
                tenantId: TENANT_ID,
                ...s,
                createdAt: plan.startDate,
              })),
            },
          },
        });
        console.log(`✅ Plan created: ${plan.planNumber} (${plan.tenureMonths}m) — ${plan.status}`);
      } catch (e) {
        console.log(`⚠️  Plan ${plan.planNumber} skipped: ${e.message}`);
      }
    } else {
      console.log(`ℹ️  Plan ${plan.planNumber} already exists`);
    }
  }

  // ─── Trade-In Records ─────────────────────────────────────────────────────

  const tradeIns = [
    {
      id: 'demo-tradein-001',
      tradeInNumber: 'TRD-0001',
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      deviceBrand: 'Apple',
      deviceModel: 'iPhone 12',
      deviceImei: '350000000000001',
      deviceStorage: '64GB',
      deviceColor: 'Black',
      conditionChecks: {
        screenCracked: false,
        bodyDamaged: false,
        batteryIssue: true,
        waterDamage: false,
        cameraWorking: true,
        chargingWorking: true,
        speakerWorking: true,
        micWorking: true,
        fingerprintWorking: false,
        wifiWorking: true,
      },
      conditionGrade: 'GOOD',
      marketValue: paisa(22000),
      offeredValue: paisa(14300), // 65% of market (GOOD grade)
      status: 'ACCEPTED',
      notes: 'Battery health 71%, Face ID not working. Good screen.',
    },
    {
      id: 'demo-tradein-002',
      tradeInNumber: 'TRD-0002',
      customerId: null,
      customerName: 'Priya Mehta',
      customerPhone: '9812345678',
      deviceBrand: 'Samsung',
      deviceModel: 'Galaxy S21',
      deviceImei: '350000000000002',
      deviceStorage: '128GB',
      deviceColor: 'Phantom Gray',
      conditionChecks: {
        screenCracked: true,
        bodyDamaged: false,
        batteryIssue: false,
        waterDamage: false,
        cameraWorking: true,
        chargingWorking: true,
        speakerWorking: true,
        micWorking: true,
        fingerprintWorking: true,
        wifiWorking: true,
      },
      conditionGrade: 'FAIR',
      marketValue: paisa(18000),
      offeredValue: paisa(9000), // 50% of market (FAIR grade)
      status: 'OFFERED',
      notes: 'Screen has a crack on the corner. Rest everything working.',
    },
    {
      id: 'demo-tradein-003',
      tradeInNumber: 'TRD-0003',
      customerId: null,
      customerName: 'Amit Verma',
      customerPhone: '9999900001',
      deviceBrand: 'OnePlus',
      deviceModel: 'Nord 3',
      deviceImei: null,
      deviceStorage: '256GB',
      deviceColor: 'Misty Green',
      conditionChecks: {},
      conditionGrade: 'FAIR',
      marketValue: 0,
      offeredValue: 0,
      status: 'DRAFT',
      notes: 'Walk-in — assessment pending',
    },
  ];

  for (const ti of tradeIns) {
    const existing = await prisma.tradeIn.findUnique({
      where: { shopId_tradeInNumber: { shopId: SHOP_ID, tradeInNumber: ti.tradeInNumber } },
    }).catch(() => null);

    if (!existing) {
      await prisma.tradeIn.create({
        data: {
          ...ti,
          tenantId: TENANT_ID,
          shopId: SHOP_ID,
          createdBy: TENANT_ID,
          createdAt: daysAgo(Math.floor(Math.random() * 10) + 1),
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Trade-in created: ${ti.tradeInNumber} — ${ti.deviceBrand} ${ti.deviceModel} (${ti.status})`);
    } else {
      console.log(`ℹ️  Trade-in ${ti.tradeInNumber} already exists`);
    }
  }

  // ─── Commission Rules ─────────────────────────────────────────────────────

  const rules = [
    {
      id: 'demo-rule-001',
      name: 'All Sales 2%',
      applyTo: 'ALL_STAFF',
      type: 'PERCENTAGE_OF_SALE',
      value: 2,
      isActive: true,
    },
    {
      id: 'demo-rule-002',
      name: 'Mobile Profit 10%',
      applyTo: 'ALL_STAFF',
      category: 'MOBILE',
      type: 'PERCENTAGE_OF_PROFIT',
      value: 10,
      isActive: true,
    },
    {
      id: 'demo-rule-003',
      name: 'Accessories Fixed ₹30/unit',
      applyTo: 'ALL_STAFF',
      category: 'ACCESSORIES',
      type: 'FIXED_PER_ITEM',
      value: 30,
      isActive: false,
    },
  ];

  for (const rule of rules) {
    const existing = await prisma.commissionRule.findFirst({
      where: { id: rule.id },
    }).catch(() => null);

    if (!existing) {
      await prisma.commissionRule.create({
        data: {
          ...rule,
          tenantId: TENANT_ID,
          shopId: SHOP_ID,
          createdAt: daysAgo(30),
        },
      });
      console.log(`✅ Commission rule created: ${rule.name}`);
    } else {
      console.log(`ℹ️  Rule "${rule.name}" already exists`);
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('📊 What was seeded for test@gmail.com:');
  console.log('   - 3 EMI Applications (APPROVED / APPLIED / SETTLED)');
  console.log('   - 2 Installment Plans with monthly slots');
  console.log('     • KIS-0001: 2 of 5 slots paid, 3 pending (active)');
  console.log('     • KIS-0002: 4 fresh slots due next month');
  console.log('   - 3 Trade-Ins: iPhone 12 (ACCEPTED), Galaxy S21 (OFFERED), OnePlus Nord 3 (DRAFT)');
  console.log('   - 3 Commission Rules (2 active, 1 inactive)');
  console.log('\n🔗 Login:  test@gmail.com');
  console.log('🔗 Pages:  /finance, /trade-in, /staff-management (Commission tab)');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
