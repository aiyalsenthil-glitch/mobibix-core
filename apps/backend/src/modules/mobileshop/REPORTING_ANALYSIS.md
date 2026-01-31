# Step 5: Reporting Module Analysis & Implementation Plan

This document outlines the architecture, data sources, and logic for the **Read-Only** Reporting Module.

## 📊 Overview
We will implement a dedicated `MobileShopReportsModule` containing:
-   `ReportsController`: Endpoints for Dashboard, Sales, Purchases, Inventory, Profit.
-   `ReportsService`: Read-only Prisma queries (using Raw SQL where necessary for performance/aggregation).

## 1️⃣ Dashboard - Owner Overview

**Objectives:**
-   **Total Sales (Paid)**: Revenue actually collected.
-   **Total Sales (Credit)**: Revenue claimed but not yet collected (Receivables).
-   **Total Purchases**: Total cost of Goods.
-   **Total Expense**: Operating expenses (Vouchers).
-   **Net Cash Flow**: Real money movement.
-   **Pending Receivables**: `Sum(Invoice Total) - Sum(Receipts)`.
-   **Pending Payables**: `Sum(Purchases) - Sum(Payments)`.

**Logic:**
-   **Sales (Paid)**: `Sum(Receipt.amount)` where `receiptType = CUSTOMER` (and not cancelled).
-   **Sales (Credit)**: This is "Outstanding". Calculated as `Total Invoiced - Total Collected`.
    -   `Total Invoiced` = `Sum(Invoice.totalAmount)`.
    -   `Total Collected` = `Sales (Paid)`.
    -   `Pending` = `Total Invoiced - Total Collected`.
-   **Purchases**: `Sum(Purchase.grandTotal)` (excluding Cancelled).
-   **Expenses**: `Sum(PaymentVoucher.amount)` where `voucherType = EXPENSE`.
-   **Cash Flow**:
    -   `IN`: `Sum(FinancialEntry.amount)` where `type = IN`.
    -   `OUT`: `Sum(FinancialEntry.amount)` where `type = OUT`.
    -   `Net`: `IN - OUT`.
-   **Pending Payables**:
    -   `Sum(Purchase.grandTotal)` - `Sum(Purchase.paidAmount)`. (Note: `Purchase` table *has* `paidAmount`).

## 2️⃣ Sales Report

**Columns:**
-   `Profit (LPP)`: Calculated as `(ItemRate - Cost) * Qty`.

**Critical Finding (Profit)**:
-   `InvoiceItem` table does **NOT** store `costPrice`.
-   Cost is intended to be stored in the linked `StockLedger` entry (`referenceId = InvoiceItem.id`).
-   **Current State**: `SalesService` currently passes `undefined` cost to `StockLedger`.
-   **Result**: The Profit column **WILL show NULL** for all current transactions. This is correct behavior per "No derived data without a source" rule. We will not "guess" the cost.

**Query Strategy:**
-   Fetch `Invoice` with `Include: { items, receipts }`.
-   Calculate `Paid Amount` = `Sum(Receipts)`.
-   Calculate `Pending` = `Total - Paid`.
-   To get Profit:
    -   Fetch `StockLedger` entries where `referenceType = SALE` and `referenceId IN (InvoiceItemIds)`.
    -   Map cost from Ledger back to Item.

## 3️⃣ Purchase Report

**Columns:**
-   `Stock Received`: Derived from `Purchase.status` or `PurchaseItem`? No, simpler: All purchases in MobiBix imply stock receipt (unless PO). But `Purchase` table assumes "Bill Entry". We will assume Yes/No based on `status != DRAFT`.
-   `Paid/Pending`: Directly from `Purchase.paidAmount` vs `grandTotal`.

## 4️⃣ Inventory Report

**Columns:**
-   `Available Qty`: Aggregation of `StockLedger`.
-   `Cost Price`: `ShopProduct.costPrice` (LPP).
-   `Value`: `Qty * Cost`.

**Logic:**
-   **SQL**: `SELECT shopProductId, SUM(CASE WHEN type='IN' THEN quantity ELSE -quantity END) as balance FROM StockLedger GROUP BY shopProductId`.
-   Join with `ShopProduct` to get Name, IMEI status, and `costPrice`.
-   Filter `balance != 0`.

## 5️⃣ Profit Summary (Safe Logic)

**Metrics:**
-   `Total Revenue`: `Sum(InvoiceItem.lineTotal)`.
-   `Total Cost (LPP)`: `Sum(StockLedger.quantity * StockLedger.costPerUnit)` where type=OUT and ref=SALE.
-   `Gross Profit`: Revenue - Cost.

**Note**: As noted in (2), Cost/Profit will likely be 0/NULL initially.

## ✅ Verification Plan

1.  **Cross-Check**:
    -   Run `Inventory Report`. Check if Qty matches Dashboard.
    -   Create a Sale. Check if `Sales Report` shows new row.
    -   Check if `Profit` is NULL (Expected).
2.  **Accounting Sanity**:
    -   Verify `Cash Flow` matches `FinancialEntry` table sum manually.

---

**Implementation Constraints:**
-   Module: `src/modules/mobileshop/reports/`
-   No schema changes.
-   Read-Only Services.
