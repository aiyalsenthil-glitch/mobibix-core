# 🎯 IMPLEMENTATION ROADMAP SUMMARY

**Document**: Comprehensive guide for Tier-2 + Hardening implementation

---

## 📊 OVERVIEW

| Component              | Scope                                                     | Effort       | Status      |
| ---------------------- | --------------------------------------------------------- | ------------ | ----------- |
| **Schema**             | 6 migrations (Purchase, Invoice, Items, Voucher, Advance) | 1 day        | Ready ✅    |
| **Core Services**      | 3 (Purchase, Receipt, Voucher)                            | 3 days       | Specified   |
| **Hardening Services** | 8 (GST, Audit, Advance, Reports, Tax)                     | 5 days       | Specified   |
| **API Endpoints**      | 8 new endpoints                                           | 2 days       | Specified   |
| **Frontend Types**     | Update 2 type files                                       | 1 day        | Specified   |
| **Frontend Pages**     | Modify 4 + Create 3 pages                                 | 5 days       | Specified   |
| **Tests**              | 9 tests (unit + E2E)                                      | 2 days       | Specified   |
| **CA Review**          | GSTR/ITC/Aging validation                                 | 2 days       | Planned     |
| **Deployment**         | Docs + staging validation                                 | 1 day        | Planned     |
| **TOTAL**              | **40 tasks across 6 phases**                              | **~4 weeks** | 0% executed |

---

## 📁 KEY DOCUMENTS (DELIVERED)

1. **ACCOUNTING_SPINE_CA_ANALYSIS.md** (10,000 words)
   - Current state assessment
   - 8 critical gaps identified
   - Module-wise maturity scores

2. **TIER2_ACCOUNTING_IMPLEMENTATION_SPEC.md** (2,800 lines)
   - Part 1-9: Complete implementation specification
   - Code templates for all services
   - Report query specifications

3. **TIER2_HARDENING_FIXES.md** (6,500 lines)
   - Risk #1-6: Detailed fixes with code
   - Schema changes with backfill logic
   - Service implementations

4. **IMPLEMENTATION_EXECUTION_PLAN.md** (This document)
   - 40 tasks breakdown
   - Phase-by-phase execution
   - Quick reference templates

5. **SCHEMA_UPDATE_PHASE1.md**
   - Prisma schema changes
   - Migration generation steps
   - Data verification queries
   - Rollback plan

---

## 🔄 PHASE BREAKDOWN

### PHASE 1: SCHEMA (Days 1-2) [CURRENT]

**Tasks**: 1-6 | **Deliverable**: All migrations applied + verified

**Actions**:

1. Update `prisma/schema.prisma` with all models
2. Run `npx prisma migrate dev --name "tier2_hardening_complete"`
3. Verify data integrity with SQL checks
4. Confirm Prisma Client regeneration
5. Commit schema changes to git

**Success Criteria**:

- ✅ Migration applies without errors
- ✅ All data backfill queries pass
- ✅ No broken Prisma types
- ✅ Zero compilation errors

---

### PHASE 2: BACKEND SERVICES (Days 3-7)

**Tasks**: 7-19 | **Deliverable**: All services implemented + tested

**Services to Implement**:

#### TIER2 Core (3 services)

- `purchases.service.ts` - atomicPurchaseSubmit() + validations
- `receipts.service.ts` - createReceipt() with Invoice update
- `vouchers.service.ts` - createVoucher() with Purchase update

#### Hardening Services (8 services)

- `gst-verification.service.ts` - verifyLegacyGST(), getUnverifiedLegacy()
- `purchase-audit.service.ts` - logSubmissionAttempt(), getHistory()
- `receipts-integrity.service.ts` - validateRevenueIntegrity()
- `advance-application.service.ts` - applyAdvance(), getBalance()
- `gstr1.service.ts` - generateSalesRegister() per-item HSN
- `gstr2.service.ts` - generatePurchaseRegister() with ITC
- `aging.service.ts` - getReceivablesAging(), getPayablesAging()
- `item-tax.service.ts` - calculateItemTax(), validateRates()

**Code Templates Available In**:

- TIER2_ACCOUNTING_IMPLEMENTATION_SPEC.md (Part 2-3)
- TIER2_HARDENING_FIXES.md (Risk #1-6)
- IMPLEMENTATION_EXECUTION_PLAN.md (Quick Reference section)

**Success Criteria**:

- ✅ All services compile
- ✅ Validations match spec exactly
- ✅ Atomic transactions working
- ✅ Unit tests passing

---

### PHASE 3: API CONTROLLERS (Days 8-9)

**Tasks**: 20-23 | **Deliverable**: 8 new endpoints + validation

**Endpoints to Create/Enhance**:

#### TIER2 Endpoints (4)

- `GET /api/mobileshop/reports/gstr1` - Sales register
- `GET /api/mobileshop/reports/gstr2` - Purchase register
- `GET /api/mobileshop/reports/receivables-aging` - AR aging
- `GET /api/mobileshop/reports/payables-aging` - AP aging

#### Hardening Endpoints (4)

- `POST /api/mobileshop/purchases/:id/submit` - Atomic submission
- `GET /api/mobileshop/purchases/legacy-gst/unverified` - CA review list
- `POST /api/mobileshop/purchases/:id/verify-gst` - CA verification
- `POST /api/mobileshop/vouchers/advance/:id/apply-to-purchase` - Apply advance

**Controllers to Enhance**:

- `reports.controller.ts` - Add 4 report endpoints
- `purchases.controller.ts` - Add 3 verification endpoints
- `vouchers.controller.ts` - Add 1 advance endpoint

**Success Criteria**:

- ✅ All endpoints respond with correct status codes
- ✅ Error handling matches spec
- ✅ Authentication guards in place
- ✅ Query/path parameters validated

---

### PHASE 4: FRONTEND (Days 10-14)

**Tasks**: 24-32 | **Deliverable**: Types updated + 7 pages modified/created

**Type Updates** (Tasks 24-25):

- Update `Invoice` type: add `paidAmount`, change `status` enum
- Update `Purchase` type: add `supplierGstin`
- Create types for GSTR-1/2/Aging reports

**Page Modifications** (Tasks 26-29):

- ✏️ Invoice List: Add status column, paidAmount, filter by status
- ✏️ Purchase Form: Add GSTIN field, validation, warning
- ✏️ Receipt Form: Show outstanding, cap amount input
- ✏️ Voucher Form: Show outstanding, cap amount, real-time validation

**New Pages** (Tasks 30-32):

- 📄 GSTR-1 Report: B2B table, B2C summary, HSN table, export
- 📄 Receivables Aging: Summary cards, customer-wise table, filters
- 📄 Payables Aging: Summary cards, supplier-wise table, filters

**Code Templates Available In**:

- TIER2_ACCOUNTING_IMPLEMENTATION_SPEC.md (Part 5)

**Success Criteria**:

- ✅ All TypeScript types compile
- ✅ No prop type mismatches
- ✅ Forms validate user input
- ✅ Reports render with sample data
- ✅ Export buttons functional

---

### PHASE 5: TESTING (Days 15-17)

**Tasks**: 33-36 | **Deliverable**: All tests passing

**Unit Tests** (Task 33):

```
✅ GSTIN validation: required if GST, format validation
✅ Receipt validation: amount > 0, not over-collection
✅ Purchase validation: future date rejection, 180-day window
✅ Stock atomicity: created on submission, rolled back on failure
✅ Invoice settlement: status updates correctly
✅ Over-payment prevention: voucher amount capped
```

**Integration Tests** (Task 34):

```
✅ E2E: Purchase → Submit → Stock created
✅ E2E: Invoice → Receipt → Status updated
✅ E2E: Over-payment attempt → Rejected
```

**Database Tests** (Task 35):

```
✅ Migration applied successfully
✅ Backfill data integrity verified
✅ No NULL constraint violations
✅ Foreign key relationships intact
```

**API Tests** (Task 36):

```
✅ GET /gstr1 returns correct format
✅ GET /gstr2 excludes legacy data by default
✅ GET /aging returns buckets correctly
✅ POST /submit rejects duplicate submissions
```

**Test Files to Create**:

- `tests/purchases.validation.spec.ts` - Unit tests
- `tests/tier2-accounting.e2e.spec.ts` - Integration tests

---

### PHASE 6: CA REVIEW & DEPLOYMENT (Days 18-20)

**Tasks**: 37-40 | **Deliverable**: CA sign-off + production ready

**CA Review** (Tasks 37-38):

- ✔️ GSTR-1/2 formats match India tax return requirements
- ✔️ GSTIN validation correct (15-char format)
- ✔️ ITC calculation per CGST Act Sec 16
- ✔️ Aging buckets standard (30/60/90/90+)
- ✔️ Invoice settlement bi-directional
- ✔️ Advance vouchers not auto-payment
- ✔️ Legacy GST flagged and excludable

**Documentation** (Task 39):

- Database migration guide
- Backfill logic explanation
- Rollback procedures
- Data validation queries

**Deployment** (Task 40):

- [ ] Pre-deployment backup
- [ ] Staging environment test
- [ ] CA approval signed
- [ ] Rollback plan documented
- [ ] Production deployment scheduled

---

## 🔑 KEY IMPLEMENTATION RULES

### ✅ DO

1. **Always use Serializable isolation for Purchase submission** to prevent race conditions
2. **Make Invoice.paidAmount updates ATOMIC with Receipt creation** (same transaction)
3. **Split ADVANCE from SETTLEMENT vouchers** - ADVANCE doesn't auto-reduce purchase
4. **Store tax rates in items (cgstRate/sgstRate/igstRate)** - never hardcode 9%/18%
5. **Mark legacy GST data with flag** - exclude from ITC totals unless CA verified
6. **Build GSTR-1 per InvoiceItem HSN** - not per Invoice (supports multi-HSN)
7. **Log all submission attempts** - success and failure, for audit trail
8. **Prevent over-collection/over-payment** - cap input fields at outstanding amount
9. **Exclude RECEIPT_CANCELLATION from revenue** - but include in cashbook OUT
10. **Test idempotency** - submitting purchase twice must reject 2nd attempt

### ❌ DON'T

1. Don't hardcode GST rates (9%, 18%) in reports
2. Don't update Purchase.paidAmount from ADVANCE vouchers
3. Don't auto-calculate historical GST (use backfill conservative estimate)
4. Don't create FinancialEntry on purchase creation (only on submission)
5. Don't allow CREDIT as payment method (rejects at validation)
6. Don't include VOIDED invoices in revenue reports
7. Don't mix CGST/SGST with IGST in same transaction
8. Don't skip validation gates (future dates, GSTIN format, amounts)
9. Don't combine multiple operations outside transactions
10. Don't block operations due to legacy data (flag and continue)

---

## 📋 IMPLEMENTATION CHECKLIST

### Pre-Development

- [ ] All 5 specification documents reviewed
- [ ] 40-task plan understood by team
- [ ] Schema changes approved by DBA
- [ ] Staging environment prepared
- [ ] Production backup strategy confirmed

### Phase 1 Completion

- [ ] Schema updated in schema.prisma
- [ ] Migration generated and tested on staging
- [ ] Data integrity verified with SQL checks
- [ ] Prisma Client types regenerated
- [ ] Zero compilation errors
- [ ] Schema changes committed to git

### Phase 2-3 Completion

- [ ] All 11 services implemented and compiled
- [ ] All 8 API endpoints created and responding
- [ ] Code follows TIER2 spec exactly
- [ ] No hardcoded magic numbers
- [ ] TypeScript strict mode passing

### Phase 4 Completion

- [ ] Frontend types updated
- [ ] All 7 pages (4 modified + 3 new) working
- [ ] Form validations in place
- [ ] Report pages rendering correctly
- [ ] Export functionality tested

### Phase 5 Completion

- [ ] All 9 tests passing (unit + integration)
- [ ] Staging database migration successful
- [ ] API endpoint tests passing
- [ ] No SQL injection vulnerabilities
- [ ] Performance acceptable (< 5s for reports)

### Phase 6 Completion

- [ ] CA review completed and approved
- [ ] All issues resolved
- [ ] Documentation finalized
- [ ] Rollback plan tested
- [ ] Production deployment scheduled
- [ ] **TIER2 ACCOUNTING SPINE HARDENED ✅**

---

## 🎓 TEAM RESPONSIBILITIES

### Backend Engineers (2)

- Implement all services (Phases 2-3)
- Write unit & integration tests
- Optimize report queries
- Handle database optimization

### Frontend Engineer (1)

- Implement UI updates (Phase 4)
- Form validations
- Report page rendering
- Export functionality

### CA Architect (1)

- Review specs before Phase 1
- CA approval for Phase 6
- Validate GSTR formats
- Approve legacy GST handling
- Sign-off on ITC logic

### QA (1)

- Test migrations on staging
- API endpoint testing
- E2E testing
- Data integrity validation

---

## 📞 ESCALATION POINTS

| Issue                       | Resolution                                                        |
| --------------------------- | ----------------------------------------------------------------- |
| Migration fails on staging  | Check SCHEMA_UPDATE_PHASE1.md rollback section                    |
| GSTR-1/2 format questions   | Reference ACCOUNTING_SPINE_CA_ANALYSIS.md (Risk #6)               |
| Idempotency test fails      | Review atomicPurchaseSubmit() in IMPLEMENTATION_EXECUTION_PLAN.md |
| Legacy GST handling unclear | See TIER2_HARDENING_FIXES.md (Risk #1)                            |
| Over-collection validation  | See TIER2_ACCOUNTING_IMPLEMENTATION_SPEC.md (Part 2.2)            |
| Advance voucher logic       | See TIER2_HARDENING_FIXES.md (Risk #4)                            |

---

## 🚀 NEXT IMMEDIATE STEPS

1. **TODAY**: Review SCHEMA_UPDATE_PHASE1.md
2. **DAY 1-2**: Apply Prisma schema changes + migration
3. **DAY 3**: Implement Purchase submission service
4. **DAY 4**: Implement Receipt service
5. **DAY 5**: Implement Voucher + Report services
6. **WEEK 2**: API endpoints + Frontend
7. **WEEK 3**: Testing + CA review
8. **WEEK 4**: Deployment

---

**Status**: ✅ **READY FOR DEVELOPMENT TEAM TO BEGIN PHASE 1**

All specifications, code templates, migration scripts, and validation queries are provided.  
No ambiguity. No guesswork. Ready to execute.
