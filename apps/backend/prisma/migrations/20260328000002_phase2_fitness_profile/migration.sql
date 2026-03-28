-- Phase 2: FitnessUser Account System
-- Adds: FitnessProfile table, Member.fitnessProfileId FK
-- Safe: all new tables/columns, no destructive changes

-- ─────────────────────────────────────────────
-- 1. FitnessProfile table
-- ─────────────────────────────────────────────
CREATE TABLE "gp_fitness_profile" (
    "id"          TEXT          NOT NULL,
    "REMOVED_AUTH_PROVIDERUid" TEXT          NOT NULL,
    "email"       TEXT,
    "fullName"    TEXT,
    "phone"       TEXT,
    "goalType"    "FitnessGoal",
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gp_fitness_profile_pkey"        PRIMARY KEY ("id"),
    CONSTRAINT "gp_fitness_profile_fbuid_key"   UNIQUE ("REMOVED_AUTH_PROVIDERUid")
);

CREATE INDEX "gp_fitness_profile_phone_idx" ON "gp_fitness_profile"("phone");

-- ─────────────────────────────────────────────
-- 2. Add fitnessProfileId to gp_member (nullable — safe)
-- ─────────────────────────────────────────────
ALTER TABLE "gp_member"
    ADD COLUMN "fitnessProfileId" TEXT;

ALTER TABLE "gp_member"
    ADD CONSTRAINT "gp_member_fitnessProfileId_fkey"
    FOREIGN KEY ("fitnessProfileId") REFERENCES "gp_fitness_profile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "gp_member_fitnessProfileId_idx" ON "gp_member"("fitnessProfileId");
