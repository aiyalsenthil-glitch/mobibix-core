const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const prefixMap = {
  mb: [
    'Party', 'CustomerFollowUp', 'CustomerReminder', 'LoyaltyConfig', 'LoyaltyTransaction', 'CustomerAlert',
    'Shop', 'ShopDocumentSetting', 'ShopStaff', 'JobCard', 'HSNCode', 'ProductCategory', 'GlobalProduct',
    'ShopProduct', 'IMEI', 'StockLedger', 'StockCorrection', 'Invoice', 'InvoiceItem', 'JobCardPart',
    'FinancialEntry', 'Purchase', 'PurchaseItem', 'SupplierPayment', 'Receipt', 'PaymentVoucher',
    'AdvanceApplication', 'Quotation', 'QuotationItem', 'PurchaseOrder', 'PurchaseOrderItem',
    'WholesaleCatalog', 'B2BPurchaseOrder', 'B2BOrderItem', 'Distributor', 'DistributorTenantLink',
    'PartnerReferral'
  ],
  gp: [
    'Member', 'MemberPayment', 'GymMembership', 'GymAttendance'
  ],
  lg: [
    'LedgerCustomer', 'LedgerAccount', 'LedgerCollection', 'LedgerPayment'
  ]
};

function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

// 1. Add @@map to models
for (const [prefix, models] of Object.entries(prefixMap)) {
  for (const model of models) {
    const tableMapName = `${prefix}_${toSnakeCase(model)}`;
    const mapStr = `\n  @@map("${tableMapName}")\n}`;
    const regex = new RegExp(`(model\\s+${model}\\s+\\{[\\s\\S]*?\\n)(\\})`);
    
    // Check if it already has @@map
    const match = schema.match(regex);
    if (match && !match[1].includes('@@map')) {
      schema = schema.replace(regex, `$1${mapStr}`);
    }
  }
}

// 2. Add lastLoginAt to Tenant
if (!schema.includes('lastLoginAt')) {
  schema = schema.replace(/model Tenant \{/, `model Tenant {\n  lastLoginAt DateTime?\n`);
}

// 3. Add AdminRole enum and AdminUser model
if (!schema.includes('enum AdminRole')) {
  schema += `\n
enum AdminRole {
  SUPER_ADMIN
  FINANCE_ADMIN
  SUPPORT_ADMIN
  PRODUCT_ADMIN
}

model AdminUser {
  id           String      @id @default(cuid())
  userId       String      @unique
  role         AdminRole   @default(PRODUCT_ADMIN)
  productScope ModuleType?
  createdAt    DateTime    @default(now())
  user         User        @relation(fields: [userId], references: [id])

  @@index([role])
}
`;
}

// 4. Add AiUsageLog model
if (!schema.includes('model AiUsageLog')) {
  schema += `\n
model AiUsageLog {
  id               String     @id @default(cuid())
  tenantId         String
  module           ModuleType
  feature          String
  model            String
  promptTokens     Int
  completionTokens Int
  totalTokens      Int
  costUsd          Float
  createdAt        DateTime   @default(now())
  
  tenant           Tenant     @relation(fields: [tenantId], references: [id])

  @@index([tenantId, createdAt])
  @@index([module, createdAt])
  @@map("ai_usage_logs")
}
`;
}

// 5. Add PromoUsage table
if (!schema.includes('model PromoUsage')) {
  schema += `\n
model PromoUsage {
  id        String   @id @default(cuid())
  promoId   String
  userId    String
  tenantId  String
  createdAt DateTime @default(now())

  promo     PromoCode @relation(fields: [promoId], references: [id])
  user      User      @relation(fields: [userId], references: [id])
  tenant    Tenant    @relation(fields: [tenantId], references: [id])

  @@unique([promoId, userId])
  @@index([promoId])
  @@index([userId])
  @@index([tenantId])
  @@map("promo_usages")
}
`;
  // Add relation to PromoCode
  schema = schema.replace(
    /(model PromoCode \{[\s\S]*?)(\})/,
    `$1  usages PromoUsage[]\n$2`
  );
  // Add relation to User
  schema = schema.replace(
    /(model User \{[\s\S]*?)(\})/,
    `$1  promoUsages PromoUsage[]\n$2`
  );
  // Add relation to Tenant
  schema = schema.replace(
    /(model Tenant \{[\s\S]*?)(\})/,
    `$1  promoUsages PromoUsage[]\n$2`
  );
}

// 6. Add specific indexes
const tenantSubIndexRegex = /@@index\(\[status,\s*module\]\)/;
if (!schema.match(tenantSubIndexRegex)) {
  schema = schema.replace(
    /(model TenantSubscription \{[\s\S]*?)(\})/,
    `$1  @@index([status, module])\n$2`
  );
}

const paymentIndexRegex = /@@index\(\[module,\s*createdAt\(sort:\s*Desc\)\]\)/;
if (!schema.match(paymentIndexRegex)) {
  // Add module if it's missing in Payment? Wait, does Payment have module?
  const hasModule = schema.match(/model Payment \{[\s\S]*?module\s+ModuleType/);
  if (!hasModule) {
    schema = schema.replace(
      /(model Payment \{[\s\S]*?)(\})/,
      `$1\n  module ModuleType @default(MOBILE_SHOP)\n  @@index([module, createdAt(sort: Desc)])\n$2`
    );
  } else {
    schema = schema.replace(
      /(model Payment \{[\s\S]*?)(\})/,
      `$1  @@index([module, createdAt(sort: Desc)])\n$2`
    );
  }
}

const auditLogIndexRegex = /@@index\(\[createdAt\(sort:\s*Desc\)\]\)/;
if (!schema.match(auditLogIndexRegex)) {
  schema = schema.replace(
    /(model PlatformAuditLog \{[\s\S]*?)(\})/,
    `$1  @@index([createdAt(sort: Desc)])\n$2`
  );
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully');
