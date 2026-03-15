# Fix Implementation Plan — Task List

## TIER 1: Access Control & Security (Foundation)

- [ ] 1.1 Auth exchange tenant resolution
  - [x] Include `tenantCode` in auth response (backend)
  - [x] Store `tenant_code` in GymPilot login (frontend) — needed for QR generation
  - [ ] Resolve `tenantCode` → `tenantId` lookup in auth exchange (verify + add tests)
- [ ] 1.2 Role guard enforcement
  - [x] Add global `RolesGuard` alongside `JwtAuthGuard`
  - [x] Audit controllers and add `@Roles('admin','owner','staff')` where required
  - [ ] Add integration tests for unauthorized access
- [x] 1.3 Shop-level access enforcement
  - [x] Extract shared `assertShopAccess(userId, shopId, tenantId)`
  - [x] Apply to sales/purchases/repair services
  - [x] Add tests for cross-shop access denial

---

## TIER 2: Frontend Auth & Navigation

- [x] 2.1 Fix GymPilot payments page (member payments endpoint)
- [x] 2.2 Multi-tenant staff selection (MobiBix + GymPilot)
  - [x] Backend `GET /auth/my-tenants`
  - [ ] MobiBix tenant selector UI
  - [ ] GymPilot tenant switcher UI
- [ ] 2.3 Wire MobiBix staff management UI to backend

---

## TIER 3: Data Model & Workflow Completion

- [ ] 3.1 Jobcard workflow fields (assignment, priority, SLA)
- [ ] 3.2 Global plan feature gating
- [ ] 3.3 Wire MobiBix plan selection UI to backend

---

## TIER 4: Quality & Scale

- [ ] 4.1 Role + permission tests
- [ ] 4.2 Tenant isolation tests
- [ ] 4.3 Error handling + logging improvements

---

## Done in This Pass

- [x] Added `tenantCode` to backend auth response
- [x] Stored `tenant_code` in GymPilot login flow
- [x] Added `@Roles(OWNER, STAFF)` to sales, purchases, suppliers, and job-cards controllers
- [x] Added `@Roles(OWNER, STAFF)` to inventory, stock report/correction, shop-products, shops, users, subscriptions, plans, payments, mobileshop reports/receipts/vouchers, vouchers-hardening, and tenant usage controllers
- [x] Added `@Roles(OWNER, ADMIN, STAFF)` to CRM dashboard controller
- [x] Added `@Roles(OWNER, STAFF)` to mobileshop repair/CRM/dashboard controllers and core parties/purchases hardening controllers
- [x] Added `@Roles(OWNER, STAFF)` to stock controller, reports hardening, and purchase stock-in controller
- [x] Added `@Roles(OWNER, STAFF)` to gym attendance (authenticated routes), gym dashboard/membership/payments, ledger, and payment verification controllers
- [x] Added `@Roles(ADMIN, OWNER, STAFF)` to WhatsApp controllers (including WhatsApp CRM)
- [x] Extracted `assertShopAccess` utility for shop-tenant validation
- [x] Applied `assertShopAccess` to sales, purchase, and repair services
- [x] Created integration tests for shop access enforcement
- [x] Fixed GymPilot member payments page endpoint path (`/gym/members/:id/payments`)
- [x] Created `GET /gym/payments/history` endpoint for payments overview page
- [x] Implemented `GET /auth/my-tenants` endpoint for multi-tenant staff selection
- [x] Merged `WhatsAppCrmModule` into `WhatsAppModule` (eliminated duplicate controllers and routes)
