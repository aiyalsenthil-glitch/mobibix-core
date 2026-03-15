# ERP System State Analysis (2026-02-09)

## 1. Authentication & Access Control

Owner login — ✅ Fully working

- Backend support: Firebase → JWT exchange in [apps/backend/src/core/auth/auth.controller.ts](../src/core/auth/auth.controller.ts) and [apps/backend/src/core/auth/auth.service.ts](../src/core/auth/auth.service.ts).
- Frontend UI: MobiBix auth flow in [apps/mobibix-web/app/auth/page.tsx](../../mobibix-web/app/auth/page.tsx), GymPilot login in [apps/mobibix-web/app/(auth)/login/page.tsx](<../../mobibix-web/app/(auth)/login/page.tsx>).
- Known gaps: none observed for owner login.

Staff login — ⚠️ Partially working

- Backend support: staff invite/auto-accept and `UserTenant` linkage in [apps/backend/src/core/auth/auth.service.ts](../src/core/auth/auth.service.ts) and staff endpoints in [apps/backend/src/core/staff/staff.controller.ts](../src/core/staff/staff.controller.ts).
- Frontend UI availability: GymPilot staff UI uses backend endpoints in [apps/mobibix-web/app/(dashboard)/staff/page.tsx](<../../mobibix-web/app/(dashboard)/staff/page.tsx>). MobiBix staff UI is local mock data only in [apps/mobibix-web/app/dashboard/staff/page.tsx](../../mobibix-web/app/dashboard/staff/page.tsx).
- Known gaps: MobiBix has no real staff management UI and no tenant selection UI; multi-tenant staff selection is not implemented on the frontend.

Multi-shop access — ⚠️ Partially working

- Backend support: `Shop`/`ShopStaff` model and shop assignment in [apps/backend/prisma/schema.prisma](../prisma/schema.prisma) and staff assignment logic in [apps/backend/src/core/staff/staff.service.ts](../src/core/staff/staff.service.ts).
- Enforcement: shop access enforced in `JobCardsService.assertAccess()` in [apps/backend/src/modules/mobileshop/jobcard/job-cards.service.ts](../src/modules/mobileshop/jobcard/job-cards.service.ts); many other controllers only verify tenant.
- Frontend UI availability: shop selector exists in [apps/mobibix-web/src/context/ShopContext.tsx](../../mobibix-web/src/context/ShopContext.tsx).
- Known gaps: shop-level access not consistently enforced across sales/purchases/etc.

Role enforcement — ⚠️ Partially working

- Backend support: `RolesGuard` and `PermissionsGuard` exist and are used in some modules [apps/backend/src/core/auth/guards/roles.guard.ts](../src/core/auth/guards/roles.guard.ts), [apps/backend/src/core/auth/guards/permissions.guard.ts](../src/core/auth/guards/permissions.guard.ts).
- Frontend UI: role-based redirects in MobiBix [apps/mobibix-web/src/lib/auth-routes.ts](../../mobibix-web/src/lib/auth-routes.ts); GymPilot uses role from JWT in [apps/mobibix-web/lib/user.ts](../../mobibix-web/lib/user.ts) but no route-level role gating.
- Known gaps: several controllers only use `JwtAuthGuard` without role/permission checks (example: sales in [apps/backend/src/core/sales/sales.controller.ts](../src/core/sales/sales.controller.ts)).

## 2. Tenant, Shop & Staff Model

- Tenant → shop → staff relationships: Implemented in schema with `Tenant`, `Shop`, `ShopStaff`, `UserTenant` in [apps/backend/prisma/schema.prisma](../prisma/schema.prisma).
- Staff assignment to shop: Implemented via `shopId` in `StaffService.createStaff()` [apps/backend/src/core/staff/staff.service.ts](../src/core/staff/staff.service.ts); not required for all staff.
- Permissions per staff: Role-based via `UserRole` and `PermissionsGuard` only; no per-staff custom permissions in UI.
- Status: Implemented, but partially enforced across modules.

## 3. Jobcard & Workflow

- Job creation: Implemented in `JobCardsService.create()` [apps/backend/src/modules/mobileshop/jobcard/job-cards.service.ts](../src/modules/mobileshop/jobcard/job-cards.service.ts).
- Status transitions: Enforced by `JobStatusValidator` [apps/backend/src/modules/mobileshop/jobcard/job-status-validator.service.ts](../src/modules/mobileshop/jobcard/job-status-validator.service.ts).
- Financial side effects: advance receipts/refunds, auto-invoice on READY, stock reconciliation on cancel/return in [apps/backend/src/modules/mobileshop/jobcard/job-cards.service.ts](../src/modules/mobileshop/jobcard/job-cards.service.ts).
- UI vs backend alignment: Jobcard UI uses status transitions and backend APIs in [apps/mobibix-web/app/(app)/jobcards/page.tsx](<../../mobibix-web/app/(app)/jobcards/page.tsx>).
- Known incompleteness: assignment/priority/SLA fields are not present in DTOs (see [apps/backend/src/modules/mobileshop/jobcard/dto/create-job-card.dto.ts](../src/modules/mobileshop/jobcard/dto/create-job-card.dto.ts)).
- Status: ⚠️ Partially working (core flow works; advanced workflow attributes missing).

## 4. Invoicing & Payments

- Invoice creation paths: Sales invoices in `SalesService.createInvoice()` [apps/backend/src/core/sales/sales.service.ts](../src/core/sales/sales.service.ts); jobcard auto-invoice on READY [apps/backend/src/modules/mobileshop/jobcard/job-cards.service.ts](../src/modules/mobileshop/jobcard/job-cards.service.ts).
- Payment recording: `SalesService.collectPayment()` used via controller in [apps/backend/src/core/sales/sales.controller.ts](../src/core/sales/sales.controller.ts).
- Advance handling: jobcard advance add/refund in [apps/backend/src/modules/mobileshop/jobcard/job-cards.service.ts](../src/modules/mobileshop/jobcard/job-cards.service.ts).
- Refund/cancellation: invoice cancel reverses stock and financial entries in [apps/backend/src/core/sales/sales.service.ts](../src/core/sales/sales.service.ts).
- Ledger integrity: stock ledger and financial entries used in sales/jobcards [apps/backend/src/core/stock/stock.service.ts](../src/core/stock/stock.service.ts) and [apps/backend/src/core/sales/sales.service.ts](../src/core/sales/sales.service.ts).
- Frontend UI: MobiBix invoice UI in [apps/mobibix-web/src/services/sales.api.ts](../../mobibix-web/src/services/sales.api.ts) and jobcard integration in [apps/mobibix-web/app/(app)/jobcards/page.tsx](<../../mobibix-web/app/(app)/jobcards/page.tsx>). GymPilot has no invoice UI.
- Inconsistency: GymPilot payments page calls /payments/history (billing payments), not member fee payments [apps/mobibix-web/app/(dashboard)/payments/page.tsx](<../../mobibix-web/app/(dashboard)/payments/page.tsx>).
- Status: MobiBix ✅ mostly end-to-end; Gym ⚠️ partial (member payments only, no invoice/ledger UI).

## 5. Plans, Subscriptions & Billing

- Plan storage: database-driven in `PlanRulesService` and plans module [apps/backend/src/core/billing/plan-rules.service.ts](../src/core/billing/plan-rules.service.ts), [apps/backend/src/core/billing/plans/plans.controller.ts](../src/core/billing/plans/plans.controller.ts).
- Feature gating: `PlanFeatureGuard` and `TenantStatusGuard` exist but are not global [apps/backend/src/core/billing/guards/plan-feature.guard.ts](../src/core/billing/guards/plan-feature.guard.ts), [apps/backend/src/core/tenant/guards/tenant-status.guard.ts](../src/core/tenant/guards/tenant-status.guard.ts).
- Plan upgrade/downgrade: endpoints in [apps/backend/src/core/billing/subscriptions/subscriptions.controller.ts](../src/core/billing/subscriptions/subscriptions.controller.ts).
- Payment integration: Razorpay order/verify/webhook flow in [apps/backend/src/core/billing/payments/payments.controller.ts](../src/core/billing/payments/payments.controller.ts), [apps/backend/src/core/billing/payments/payments.verify.controller.ts](../src/core/billing/payments/payments.verify.controller.ts), [apps/backend/src/core/billing/payments/payments.webhook.controller.ts](../src/core/billing/payments/payments.webhook.controller.ts).
- Frontend UI: GymPilot plans UI calls upgrade/downgrade directly [apps/mobibix-web/app/(dashboard)/plans/page.tsx](<../../mobibix-web/app/(dashboard)/plans/page.tsx>). MobiBix plan UI is read-only with a non-wired “Select Plan” button [apps/mobibix-web/app/dashboard/owner/[tenantId]/PlanEditCard.tsx](../../mobibix-web/app/dashboard/owner/[tenantId]/PlanEditCard.tsx).
- Verdict: plans are real in backend; billing/payment UI integration is partial.

## 6. Stock & Inventory

- Part add/remove: jobcard parts affect stock; sales consumes stock; cancellation restores stock [apps/backend/src/modules/mobileshop/jobcard/job-cards.service.ts](../src/modules/mobileshop/jobcard/job-cards.service.ts), [apps/backend/src/core/sales/sales.service.ts](../src/core/sales/sales.service.ts).
- Stock deduction: enforced through `StockService` and IMEI validation [apps/backend/src/core/stock/stock.service.ts](../src/core/stock/stock.service.ts).
- Cancel/return handling: invoice cancel restores stock and IMEIs [apps/backend/src/core/sales/sales.service.ts](../src/core/sales/sales.service.ts).
- Reporting accuracy: ledger-based stock calculations are used [apps/backend/src/core/stock/stock.service.ts](../src/core/stock/stock.service.ts).
- Status: ✅ implemented for MobiBix; not applicable to Gym.

## 7. Notifications & Integrations

- WhatsApp triggers: CRM events emit and call automation handlers [apps/backend/src/modules/mobileshop/services/crm-event.listener.ts](../src/modules/mobileshop/services/crm-event.listener.ts).
- Feature gating: enforced in `WhatsAppSender` via plan rules [apps/backend/src/modules/whatsapp/whatsapp.sender.ts](../src/modules/whatsapp/whatsapp.sender.ts).
- Failure handling: logging and status updates are built-in; sending depends on valid WhatsApp config [apps/backend/src/modules/whatsapp/whatsapp.sender.ts](../src/modules/whatsapp/whatsapp.sender.ts).
- Status: ✅ implemented; runtime success depends on environment configuration and templates.

## 8. Frontend Coverage

- MobiBix: Auth, jobcards, invoices, inventory, CRM, shops, reports, settings present [apps/mobibix-web/app/(app)](<../../mobibix-web/app/(app)>).
  - Staff management UI is mock/local state only [apps/mobibix-web/app/dashboard/staff/page.tsx](../../mobibix-web/app/dashboard/staff/page.tsx).
  - Tenant switcher is stub “Coming soon” [apps/mobibix-web/app/select-tenant/page.tsx](../../mobibix-web/app/select-tenant/page.tsx).
- GymPilot: Login, members, attendance, staff, plans, payments pages exist [apps/mobibix-web/app/(dashboard)](<../../mobibix-web/app/(dashboard)>).
  - Payments page points to billing payments rather than member fee receipts [apps/mobibix-web/app/(dashboard)/payments/page.tsx](<../../mobibix-web/app/(dashboard)/payments/page.tsx>).
- Error handling: mixed; several pages show error or empty states but no unified fallback.

## 9. Known Gaps Confirmation

- Staff login: ⚠️ Partially implemented
  - Backend supports it; GymPilot UI supports invites and listing; MobiBix staff UI is mock and tenant selection is missing.
- Staff → shop assignment: ⚠️ Partially implemented
  - Backend supports `ShopStaff` and optional assignment; enforcement is only in select services (jobcards).
- Plan payment flow: ⚠️ Partially implemented
  - Razorpay backend exists; frontend does not initiate payment flow in either web UI.
- Subscription enforcement: ⚠️ Partially implemented
  - Guards exist but are not globally enforced across all modules.

## 10. Production Readiness Snapshot

- Safe to use in production today
  - MobiBix core operational flows: jobcards, invoices, stock, payments, CRM events appear functionally complete for single-tenant usage with configured WhatsApp credentials.
  - Gym basic member CRUD, attendance, and payment recording endpoints exist.

- Requires manual discipline
  - Shop-level access control is inconsistent outside jobcards.
  - Subscription gating is partial and depends on correct guard placement.
  - Billing upgrades require backend-only handling unless a payment UI is added.

- Blocks scaling/onboarding more shops
  - Tenant switcher UI is missing.
  - MobiBix staff management UI is not wired to backend.
  - Role enforcement and shop-level access control are inconsistent across modules.
