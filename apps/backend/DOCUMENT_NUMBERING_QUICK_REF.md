# Document Numbering - Quick Reference

## 🚀 Quick Start

### Generate Document Number

```typescript
const invoiceNumber = await documentNumberService.generateDocumentNumber(
  shopId,
  DocumentType.SALES_INVOICE,
  new Date(),
  tx, // Transaction client (required for locking)
);
// Result: "HP-S-2526-0001"
```

### Initialize New Shop

```typescript
await documentNumberService.initializeShopDocumentSettings(
  shop.id,
  'HP', // Shop prefix
  prisma,
);
```

---

## 📋 Document Types

| Type               | Code | Example         |
| ------------------ | ---- | --------------- |
| `SALES_INVOICE`    | S    | HP-S-2526-0001  |
| `PURCHASE_INVOICE` | P    | HP-P-2526-0001  |
| `JOB_CARD`         | J    | HP-J-2526-0001  |
| `RECEIPT`          | R    | HP-R-2526-0001  |
| `QUOTATION`        | Q    | HP-Q-2526-0001  |
| `PURCHASE_ORDER`   | PO   | HP-PO-2526-0001 |

---

## 🎨 Year Formats

| Format | Output   | Example                |
| ------ | -------- | ---------------------- |
| `FY`   | 2526     | HP-S-**2526**-0001     |
| `YYYY` | 20252026 | HP-S-**20252026**-0001 |
| `YY`   | 26       | HP-S-**26**-0001       |
| `NONE` | (none)   | HP-S-0001              |

---

## 🔄 Reset Policies

| Policy    | Behavior           | Use Case            |
| --------- | ------------------ | ------------------- |
| `YEARLY`  | Reset on April 1st | Invoices (FY-based) |
| `MONTHLY` | Reset every month  | Monthly reports     |
| `NEVER`   | Continuous         | Receipts, Job Cards |

---

## ⚙️ Customize Format

```typescript
await prisma.shopDocumentSetting.update({
  where: {
    shopId_documentType: {
      shopId: 'shop-1',
      documentType: 'SALES_INVOICE',
    },
  },
  data: {
    separator: '/', // - → /
    yearFormat: 'YY', // 2526 → 26
    numberLength: 5, // 0001 → 00001
    resetPolicy: 'NEVER', // No reset
  },
});
```

---

## 🔒 Transaction Pattern

```typescript
// ✅ CORRECT (with transaction)
return this.prisma.$transaction(async (tx) => {
  const number = await this.docNumberService.generateDocumentNumber(
    shopId,
    DocumentType.SALES_INVOICE,
    new Date(),
    tx // Pass transaction
  );

  await tx.invoice.create({ data: { invoiceNumber: number, ... } });
});

// ❌ WRONG (no transaction = race condition!)
const number = await this.docNumberService.generateDocumentNumber(...);
await this.prisma.invoice.create({ ... });
```

---

## 🛠️ Migration Commands

```bash
# Run migration
npx prisma migrate dev --name add_document_numbering_system

# Seed existing shops
ts-node scripts/initialize-document-settings.ts

# Check status
npx prisma migrate status
```

---

## 📦 Import

```typescript
import { DocumentNumberService } from '@/common/services/document-number.service';
import { DocumentType } from '@prisma/client';
```

---

## 🐛 Troubleshooting

| Error                  | Cause                | Fix                                    |
| ---------------------- | -------------------- | -------------------------------------- |
| Duplicate numbers      | No transaction       | Wrap in `$transaction()`               |
| Settings not found     | Shop not initialized | Run `initializeShopDocumentSettings()` |
| Sequence not resetting | Wrong reset policy   | Update `resetPolicy` to `YEARLY`       |

---

## 📚 Full Documentation

- [Complete Guide](./DOCUMENT_NUMBERING_SYSTEM.md)
- [Implementation Summary](./DOCUMENT_NUMBERING_COMPLETE.md)
- [Service Code](./src/common/services/document-number.service.ts)
- [Tests](./src/common/services/document-number.service.spec.ts)

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Updated**: 2026-01-28
