-- Phase 3: Body Metrics + Pro Tier
-- Adds: FitnessTier enum, FitnessProfile.tier/proExpiresAt, FitnessBodyMetric table
-- Safe: all new tables/columns, no destructive changes

-- ─────────────────────────────────────────────
-- 1. FitnessTier enum
-- ─────────────────────────────────────────────
CREATE TYPE "FitnessTier" AS ENUM ('FREE', 'PRO');

-- ─────────────────────────────────────────────
-- 2. Add tier + proExpiresAt to FitnessProfile
-- ─────────────────────────────────────────────
ALTER TABLE "gp_fitness_profile"
    ADD COLUMN "tier"         "FitnessTier" NOT NULL DEFAULT 'FREE',
    ADD COLUMN "proExpiresAt" TIMESTAMP(3);

-- ─────────────────────────────────────────────
-- 3. FitnessBodyMetric table
-- ─────────────────────────────────────────────
CREATE TABLE "gp_fitness_body_metric" (
    "id"          TEXT          NOT NULL,
    "profileId"   TEXT          NOT NULL,
    "date"        TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg"    DOUBLE PRECISION,
    "heightCm"    DOUBLE PRECISION,
    "bodyFatPct"  DOUBLE PRECISION,
    "bmi"         DOUBLE PRECISION,
    "waistCm"     DOUBLE PRECISION,
    "hipCm"       DOUBLE PRECISION,
    "armCm"       DOUBLE PRECISION,
    "chestCm"     DOUBLE PRECISION,
    "note"        TEXT,
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gp_fitness_body_metric_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gp_fitness_body_metric_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "gp_fitness_profile"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "gp_fitness_body_metric_profileId_date_idx"
    ON "gp_fitness_body_metric"("profileId", "date");
