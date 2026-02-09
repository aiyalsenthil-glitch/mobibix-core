
# Tier 2 Accounting Implementation - Migration & Review Guide

## 1. Overview
This document outlines the changes introduced in the **Tier 2 Accounting Implementation**. These changes harden the accounting core to support GST compliance, rigorous stock tracking, and verifiable financial reporting.

**Key Objectives:**
-   **GST Compliance**: Accurate capture of HSN-wise tax data, GSTR-1 (Sales), and GSTR-2 (Purchases/ITC).
-   **Atomic Consistency**: Purchase submission and stock updates occur within a single transaction.
-   **Auditability**: Every critical action (Submission, Verification) is logged.
-   **Legacy Support**: Flags to handle pre-migration data (`isLegacyGstApproximation`).

---

## 2. Schema Changes

### 2.1 Purchase Model (`Purchase`, `PurchaseItem`)
| Field | Type | Purpose |
| :--- | :--- | :--- |
| `supplierGstin` | String? | Normalized GSTIN for ITC claiming. |
| `status` | Enum | Added `submitted` state (Locked). |
| `verifiedAt` | DateTime? | Timestamp when CA verified legacy data. |
| `isLegacyGstApproximation` | Boolean | `true` for old records where GST was back-calculated. |
| `cgst`, `sgst`, `igst` | Float | Header-level tax breakdown. |
| `items.cgstResult`, ... | Float | Line-level tax breakdown. |

### 2.2 Invoice Model (`Invoice`, `InvoiceItem`)
| Field | Type | Purpose |
| :--- | :--- | :--- |
| `paidAmount` | Float | Denormalized sum of receipts for fast aging reports. |
| `status` | Enum | `DRAFT`, `SENT`, `PAID`, `PARTIALLY_PAID`, `VOIDED`, `OVERDUE`. |
| `items.hsnCode` | String? | Snapshot of HSN at time of sale. |
| `items.cgstRate` | Float | Snapshot of tax rate at time of sale. |

---

## 3. New Workflows

### 3.1 Purchase Submission (Atomic)
**Endpoint**: `POST /api/purchases/:id/submit`

**Logic**:
1.  **Validate**: Checks for mandatory GSTIN (if GST > 0) and ITC 180-day window.
2.  **Lock**: Sets status to `SUBMITTED`.
3.  **Stock**: Updates `ShopProduct` stock and writes to `StockLedger`.
4.  **Audit**: Logs the submission attempt.

> **Impact**: Once submitted, a purchase cannot be edited. This ensures that the stock level and the accounting entry (Purchase Register) are permanently synchronized.

### 3.2 Receipt Creation & Allocation
**Endpoint**: `POST /api/receipts`

**Logic**:
1.  Creates `Receipt` record.
2.  Creates `FinancialEntry` (Credit).
3.  Updates `Invoice.paidAmount` and `Invoice.status`.
4.  Prevents over-payment (Receipt amount cannot exceed Invoice pending amount).

### 3.3 GSTR Reporting
**Endpoint**: `/api/reports/gstr1` and `/api/reports/gstr2`

-   **GSTR-1**: B2B (with GSTIN), B2C Large, B2C Small, and HSN Summary.
-   **GSTR-2**: ITC Eligibility check based on "180-day rule" and "Supplier GSTIN presence".

---

## 4. Verification Procedures (For CA)

### 4.1 Verifying Legacy Data
Old purchase records may not have itemized tax breakdowns. These are flagged with `isLegacyGstApproximation = true`.

**Action Required**:
1.  Navigate to **Reports > Legacy Data Verification**.
2.  Review the approximate tax breakup.
3.  Update with actual values from physical invoice if necessary.
4.  Click **"Verify"** to mark the record as valid for ITC claims.

### 4.2 Verifying ITC Eligibility
The system automatically excludes purchases from ITC if:
-   Invoice Date is older than 180 days.
-   Supplier GSTIN is missing.
-   Record is a "Legacy Approximation" and not yet verified.

**Action Required**:
1.  Generate **GSTR-2 Report**.
2.  Check the "Ineligible ITC" section for reason codes.

---

## 5. Migration Steps

### 5.1 Database Migration
Run the following SQL script to backfill new columns:
```sql
-- 1. Initialize Status
UPDATE "Invoice" SET "status" = 'PAID' WHERE "pendingAmount" = 0;
UPDATE "Invoice" SET "status" = 'PARTIALLY_PAID' WHERE "pendingAmount" > 0 AND "pendingAmount" < "grandTotal";
UPDATE "Invoice" SET "status" = 'SENT' WHERE "pendingAmount" = "grandTotal";

-- 2. Initialize Paid Amount
UPDATE "Invoice" SET "paidAmount" = "grandTotal" - "pendingAmount";

-- 3. Flag Legacy Purchases
UPDATE "Purchase" SET "isLegacyGstApproximation" = true WHERE "createdAt" < '2025-01-01'; -- Adjust Cutoff Date
```

### 5.2 Application Update
1.  Deploy Backend API.
2.  Deploy Frontend (Mobibix Web).
3.  Verify basic flows (Create Purchase, Create Invoice).

---

## 6. API Reference

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/purchases/:id/submit` | Finalize Purchase & Update Stock |
| `GET` | `/api/reports/gstr1` | Sales Register |
| `GET` | `/api/reports/gstr2` | Purchase/ITC Register |
| `GET` | `/api/reports/receivables-aging` | Customer Outstanding Aging |
