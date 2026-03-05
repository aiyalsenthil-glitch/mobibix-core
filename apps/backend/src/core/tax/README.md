# Global Tax Engine

## Architecture

```
core/tax/
├── tax-strategy.interface.ts    # ITaxStrategy contract
├── tax-strategy.resolver.ts     # Maps countryCode → strategy
├── tax-engine.service.ts        # High-level service (tenant-aware)
├── tax.module.ts                # NestJS Module
├── strategies/
│   ├── india-gst.strategy.ts   # CGST + SGST (India)
│   ├── vat.strategy.ts          # Flat VAT (UAE, SG, MY)
│   └── no-tax.strategy.ts       # Zero-tax fallback (default)
└── README.md                    # This file
```

## How to add a new country (Phase 3+)

1. If the country uses a simple flat rate: add a `new VATStrategy('XX', 'Name', rate)` entry in `TaxStrategyResolver`.
2. If the country has complex rules (e.g., US state tax): create a new `strategies/us-sales-tax.strategy.ts` and add it to the resolver.

## Backward Compatibility Guarantee

- All tenants without a `country` field **default to IndiaGSTStrategy**.
- The existing `TaxCalculationService` is NOT deleted. It continues to work.
- No existing API routes or Android app calls are affected.
- `taxDetails` is a nullable JSON field — existing invoices without it are valid.

## Usage

```typescript
// In a Service (e.g., InvoiceService)
constructor(private readonly taxEngine: TaxEngineService) {}

const result = await this.taxEngine.calculateForTenant(tenantId, [
  { amount: 1000, taxRate: 18 },
  { amount: 500 },
]);

// result.taxDetails → { cgst: 135, sgst: 135, igst: 0 }
// result.taxTotal   → 270
// result.grandTotal → 1770
```

## Phase Roadmap

| Phase | Scope |
|-------|-------|
| **1 (Now)** | India GST only. TaxEngineService scaffolded but not wired to invoice creation. |
| **2** | Wire TaxEngineService into InvoiceService. Activate UAE, SG, MY. |
| **3** | Add DB-driven TaxRule table. Add US/Canada state tax. |
