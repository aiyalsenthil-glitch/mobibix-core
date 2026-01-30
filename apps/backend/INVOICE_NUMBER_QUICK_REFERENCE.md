# Invoice Number Format - Quick Reference

## Format Structure

```
{SHOP_PREFIX}-{TYPE}-{FINANCIAL_YEAR}-{SEQUENCE}
```

## Type Identifiers

- **S** = Sales Bill (Invoice)
- **P** = Purchase Bill (Invoice)
- **J** = Job Card

## Examples

### January 27, 2026 (Financial Year 2025-26)

| Document Type | First              | Tenth              | Hundredth          |
| ------------- | ------------------ | ------------------ | ------------------ |
| Sales         | `HP-S-202526-0001` | `HP-S-202526-0010` | `HP-S-202526-0100` |
| Purchase      | `HP-P-202526-0001` | `HP-P-202526-0010` | `HP-P-202526-0100` |
| Job Card      | `HP-J-202526-0001` | `HP-J-202526-0010` | `HP-J-202526-0100` |

## Financial Year Calculation

| Current Date   | Financial Year                            |
| -------------- | ----------------------------------------- |
| 1 Jan 2025     | 202425 (FY 2024-25)                       |
| 15 Mar 2025    | 202425 (FY 2024-25)                       |
| 31 Mar 2025    | 202425 (FY 2024-25)                       |
| **1 Apr 2025** | **202526 (FY 2025-26)** ← NEW YEAR STARTS |
| 15 May 2025    | 202526 (FY 2025-26)                       |
| 27 Jan 2026    | 202526 (FY 2025-26)                       |
| 31 Mar 2026    | 202526 (FY 2025-26)                       |
| **1 Apr 2026** | **202627 (FY 2026-27)** ← NEW YEAR STARTS |

## Implementation Files

| File                                                  | Changes                    |
| ----------------------------------------------------- | -------------------------- |
| `src/common/utils/invoice-number.util.ts`             | New utility functions      |
| `src/core/sales/sales.service.ts`                     | Sales invoice generation   |
| `src/modules/mobileshop/jobcard/job-cards.service.ts` | Job card number generation |
| `src/common/utils/invoice-number.util.spec.ts`        | Test suite                 |

## Key Functions

```typescript
// Calculate FY from date
getFinancialYear(date: Date): string
// Returns: "202526"

// Generate sales invoice number
generateSalesInvoiceNumber(prefix: string, sequence: number, date?: Date): string
// Example: generateSalesInvoiceNumber("HP", 5, new Date(2026, 0, 27))
// Returns: "HP-S-202526-0005"

// Generate job card number
generateJobCardNumber(prefix: string, sequence: number, date?: Date): string
// Example: generateJobCardNumber("HP", 5, new Date(2026, 0, 27))
// Returns: "HP-J-202526-0005"

// Generate purchase invoice number
generatePurchaseInvoiceNumber(prefix: string, sequence: number, date?: Date): string
// Example: generatePurchaseInvoiceNumber("HP", 5, new Date(2026, 0, 27))
// Returns: "HP-P-202526-0005"
```

## Current Date Info

- **Today**: January 27, 2026
- **Financial Year**: 2025-26
- **FY Code**: 202526
- **Next FY Starts**: April 1, 2026
