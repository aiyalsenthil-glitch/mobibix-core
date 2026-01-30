-- Migration: Add Platform Admin Plan Features System
-- This migration adds:
-- 1. WhatsAppFeature enum
-- 2. Plan.code and Plan.maxMembers columns
-- 3. PlanFeature junction table
-- 4. PlatformAuditLog table
-- 5. SUPER_ADMIN role

-- ============================================
-- 1. Add SUPER_ADMIN to UserRole enum
-- ============================================
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- ============================================
-- 2. Create WhatsAppFeature enum
-- ============================================
CREATE TYPE "WhatsAppFeature" AS ENUM ('WELCOME', 'EXPIRY', 'PAYMENT_DUE', 'REMINDER');

-- ============================================
-- 3. Add Plan columns (code, maxMembers)
-- ============================================
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "maxMembers" INTEGER;

-- Populate code from name (uppercase)
UPDATE "Plan" SET "code" = UPPER("name") WHERE "code" IS NULL;

-- Make code unique and NOT NULL
ALTER TABLE "Plan" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_code_key" ON "Plan"("code");

-- ============================================
-- 4. Create PlanFeature table
-- ============================================
CREATE TABLE IF NOT EXISTS "PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "feature" "WhatsAppFeature" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" 
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "PlanFeature_planId_feature_key" ON "PlanFeature"("planId", "feature");

-- Add index on planId
CREATE INDEX IF NOT EXISTS "PlanFeature_planId_idx" ON "PlanFeature"("planId");

-- ============================================
-- 5. Create PlatformAuditLog table
-- ============================================
CREATE TABLE IF NOT EXISTS "PlatformAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditLog_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index on userId
CREATE INDEX IF NOT EXISTS "PlatformAuditLog_userId_idx" ON "PlatformAuditLog"("userId");

-- ============================================
-- 6. Seed default plan features (OPTIONAL)
-- ============================================
-- BASIC: No WhatsApp features
-- (no rows needed)

-- PLUS: PAYMENT_DUE, REMINDER
INSERT INTO "PlanFeature" ("id", "planId", "feature", "enabled")
SELECT 
    gen_random_uuid()::text,
    p.id,
    f.feature,
    true
FROM "Plan" p
CROSS JOIN (
    VALUES ('PAYMENT_DUE'::\"WhatsAppFeature\"), ('REMINDER'::\"WhatsAppFeature\")
) AS f(feature)
WHERE p.code = 'PLUS'
ON CONFLICT ("planId", "feature") DO NOTHING;

-- PRO: PAYMENT_DUE, REMINDER
INSERT INTO "PlanFeature" ("id", "planId", "feature", "enabled")
SELECT 
    gen_random_uuid()::text,
    p.id,
    f.feature,
    true
FROM "Plan" p
CROSS JOIN (
    VALUES ('PAYMENT_DUE'::\"WhatsAppFeature\"), ('REMINDER'::\"WhatsAppFeature\")
) AS f(feature)
WHERE p.code = 'PRO'
ON CONFLICT ("planId", "feature") DO NOTHING;

-- ULTIMATE: ALL features
INSERT INTO "PlanFeature" ("id", "planId", "feature", "enabled")
SELECT 
    gen_random_uuid()::text,
    p.id,
    f.feature,
    true
FROM "Plan" p
CROSS JOIN (
    VALUES 
        ('WELCOME'::\"WhatsAppFeature\"),
        ('EXPIRY'::\"WhatsAppFeature\"),
        ('PAYMENT_DUE'::\"WhatsAppFeature\"),
        ('REMINDER'::\"WhatsAppFeature\")
) AS f(feature)
WHERE p.code = 'ULTIMATE'
ON CONFLICT ("planId", "feature") DO NOTHING;

-- ============================================
-- 7. Set maxMembers from existing rules
-- ============================================
UPDATE "Plan" SET "maxMembers" = 0 WHERE "code" = 'BASIC';
UPDATE "Plan" SET "maxMembers" = 50 WHERE "code" = 'PLUS';
UPDATE "Plan" SET "maxMembers" = 600 WHERE "code" = 'PRO';
UPDATE "Plan" SET "maxMembers" = 1500 WHERE "code" = 'ULTIMATE';
UPDATE "Plan" SET "maxMembers" = 25 WHERE "code" = 'TRIAL';
