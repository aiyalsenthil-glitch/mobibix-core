
# Production Readiness & Deployment Checklist (Tier 2 Accounting)

## 1. Pre-Deployment Checks
- [ ] **Data Backup**: Create a full snapshot of the production database.
- [ ] **Maintenance Window**: Schedule downtime (approx. 30 mins) for migration.
- [ ] **Environment Variables**: Verify `DATABASE_URL` and `JWT_SECRET` in the production environment.

## 2. Database Migration (Phase 1)
- [ ] **Run Migration**: Execute `npx prisma migrate deploy`.
- [ ] **Verify Schema**: Ensure `Purchase` table has `supplierGstin` and `isLegacyGstApproximation` columns.
- [ ] **Data Patching (Critical)**:
    -   Run the SQL script to initialize `Invoice.status` and `Invoice.paidAmount`.
    -   Run the SQL script to flag pre-2025 purchases as `isLegacyGstApproximation`.
    *(Refer to `TIER2_MIGRATION_GUIDE.md` Section 5.1)*

## 3. Backend Deployment (Phase 2)
- [ ] **Deploy Code**: Push the latest `main` branch to the production server.
- [ ] **Install Dependencies**: Run `npm install --omit=dev`.
- [ ] **Build**: Run `npm run build`.
- [ ] **Restart Services**: Restart the NestJS application (PM2/Docker).
- [ ] **Health Check**: Verify `/api/health` returns 200 OK.

## 4. Frontend Deployment (Phase 3)
- [ ] **Build Frontend**: Run build script for `mobibix-web`.
- [ ] **Deploy Assets**: invalid cache if using CDN (Cloudflare/Vercel).
- [ ] **Verify UI**:
    -   Check "Reports" section for "GSTR-1" and "Aging" options.
    -   Check "Purchase Form" for "Submit" button presence.

## 5. Post-Deployment Verification (Smoke Tests)
- [ ] **Create Draft Purchase**: Ensure it saves without errors.
- [ ] **Submit Purchase**: Verify stock updates and status changes to `SUBMITTED`.
- [ ] **Generate Report**: Run GSTR-1 for the current month.
- [ ] **Check Logs**: Monitor logs for any 500 errors during the first hour.

## 6. Access Handover (CA Review)
- [ ] **Create CA Account**: Ensure the Chartered Accountant has a user login.
- [ ] **Share Documentation**: Send `TIER2_MIGRATION_GUIDE.md`.
- [ ] **Schedule Review**: Set a date for GSTR verification (Tasks 37 & 38).

---

**Rollback Plan**
If critical issues arise:
1.  Revert Codebase to previous tag.
2.  Restore Database from Pre-Deployment Snapshot (Schema changes are additive, but data patches alter state).
