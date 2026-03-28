-- Phase 1: GymPilot Owner Blind Spots
-- Adds: GymPlan model, GymExpense model, Member freeze fields
-- Safe to run on production — all new tables/columns only

-- ─────────────────────────────────────────────
-- 1. New Enums
-- ─────────────────────────────────────────────
CREATE TYPE "GymPlanType" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'CUSTOM');

CREATE TYPE "GymExpenseCategory" AS ENUM (
    'RENT',
    'SALARY',
    'EQUIPMENT',
    'UTILITY',
    'MAINTENANCE',
    'MARKETING',
    'SUPPLEMENT',
    'OTHER'
);

-- ─────────────────────────────────────────────
-- 2. Add freeze fields to gp_member (all nullable/defaulted — safe)
-- ─────────────────────────────────────────────
ALTER TABLE "gp_member"
    ADD COLUMN "isFrozen"   BOOLEAN      NOT NULL DEFAULT false,
    ADD COLUMN "frozenAt"   TIMESTAMP(3),
    ADD COLUMN "frozenDays" INTEGER      NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────
-- 3. GymPlan table
-- ─────────────────────────────────────────────
CREATE TABLE "gp_gym_plan" (
    "id"           TEXT           NOT NULL,
    "tenantId"     TEXT           NOT NULL,
    "name"         TEXT           NOT NULL,
    "durationDays" INTEGER        NOT NULL,
    "price"        INTEGER        NOT NULL,
    "type"         "GymPlanType"  NOT NULL DEFAULT 'MONTHLY',
    "description"  TEXT,
    "isActive"     BOOLEAN        NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gp_gym_plan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gp_gym_plan_tenantId_isActive_idx" ON "gp_gym_plan"("tenantId", "isActive");

ALTER TABLE "gp_gym_plan"
    ADD CONSTRAINT "gp_gym_plan_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────
-- 4. GymExpense table
-- ─────────────────────────────────────────────
CREATE TABLE "gp_gym_expense" (
    "id"         TEXT                   NOT NULL,
    "tenantId"   TEXT                   NOT NULL,
    "category"   "GymExpenseCategory"   NOT NULL,
    "amount"     INTEGER                NOT NULL,
    "date"       TIMESTAMP(3)           NOT NULL,
    "note"       TEXT,
    "createdBy"  TEXT,
    "createdAt"  TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gp_gym_expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gp_gym_expense_tenantId_date_idx"     ON "gp_gym_expense"("tenantId", "date");
CREATE INDEX "gp_gym_expense_tenantId_category_idx" ON "gp_gym_expense"("tenantId", "category");

ALTER TABLE "gp_gym_expense"
    ADD CONSTRAINT "gp_gym_expense_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
