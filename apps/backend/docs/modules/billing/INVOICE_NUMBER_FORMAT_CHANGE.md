# Invoice Number Format Migration to Financial Year

## Overview

Changed invoice numbering from date-based format to financial year-based format across all document types (Sales, Purchases, Job Cards).

## Changes Made

### 1. **New Utility Functions** (`src/common/utils/invoice-number.util.ts`)

#### `getFinancialYear(date: Date): string`

- Calculates financial year from a given date
- Financial year: April - March (e.g., 202526 = FY April 2025 to March 2026)
- Logic:
  - Month < 4 (Jan-Mar): FY is `(year-1)${year}`
  - Month >= 4 (Apr-Dec): FY is `${year}${year+1}`

#### Format Functions

- `generateSalesInvoiceNumber(prefix, sequence, date)` → `{prefix}-S-{fy}-{seq}`
- `generatePurchaseInvoiceNumber(prefix, sequence, date)` → `{prefix}-P-{fy}-{seq}`
- `generateJobCardNumber(prefix, sequence, date)` → `{prefix}-J-{fy}-{seq}`

### 2. **Sales Service Updates** (`src/core/sales/sales.service.ts`)

**Old Format**: `HP-270126-0001` (prefix-DDMMYY-sequence)  
**New Format**: `HP-S-202526-0001` (prefix-S-financialYear-sequence)

Changes:

- Import utility functions
- Calculate financial year instead of date string
- Query for last invoice in current FY (using `contains` filter)
- Use `generateSalesInvoiceNumber()` to create invoice number

### 3. **Job Cards Service Updates** (`src/modules/mobileshop/jobcard/job-cards.service.ts`)

**Old Format**: `JOB-0001` (generic sequence)  
**New Format**: `HP-J-202526-0001` (prefix-J-financialYear-sequence)

Changes:

- Fetch shop's `invoicePrefix` in `nextJobNumber()`
- Calculate financial year
- Query for last job card in current FY
- Use `generateJobCardNumber()` to create job number

### 4. **Test Suite** (`src/common/utils/invoice-number.util.spec.ts`)

Comprehensive tests covering:

- Financial year calculation for all months
- Invoice number generation for all types
- Sequence padding (0001-9999)
- Different shop prefixes

## Examples

### Sales Invoice

- **Date**: 27 January 2026 (FY 2025-26)
- **Shop Prefix**: HP
- **First invoice of FY**: `HP-S-202526-0001`
- **100th invoice of FY**: `HP-S-202526-0100`

### Job Card

- **Date**: 27 January 2026 (FY 2025-26)
- **Shop Prefix**: HP
- **First job of FY**: `HP-J-202526-0001`

### Purchase (When Implemented)

- **Date**: 27 January 2026 (FY 2025-26)
- **Shop Prefix**: HP
- **First purchase of FY**: `HP-P-202526-0001`

## Financial Year Calendar

| Date Range               | Financial Year      |
| ------------------------ | ------------------- |
| 1 Jan - 31 Mar 2025      | 202425 (FY 2024-25) |
| 1 Apr 2025 - 31 Mar 2026 | 202526 (FY 2025-26) |
| 1 Apr 2026 - 31 Mar 2027 | 202627 (FY 2026-27) |

## Notes

- Sequence resets annually with each financial year
- All invoice types share the same shop prefix but use different type identifiers (S, P, J)
- Backward compatible: existing invoices retain old format, new invoices use new format
- Database queries updated to support new format with financial year filter

## Migration Impact

- ✅ Sales invoices: Updated
- ✅ Job cards: Updated
- ⏳ Purchases: Function created, ready to integrate when needed
- ⚠️ Existing invoices: Keep old numbering (no migration needed)
- ✅ All sequence tracking: Now per financial year instead of per day
