-- Phase 5: Streak tracking + Class scheduling
-- Safe: new columns with defaults, new tables, no destructive changes

-- ─────────────────────────────────────────────
-- 1. Streak fields on FitnessProfile
-- ─────────────────────────────────────────────
ALTER TABLE "gp_fitness_profile"
    ADD COLUMN IF NOT EXISTS "currentStreak" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "longestStreak"  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "lastStreakDate" TIMESTAMP(3);

-- ─────────────────────────────────────────────
-- 2. ClassBookingStatus enum
-- ─────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE "ClassBookingStatus" AS ENUM ('BOOKED', 'CANCELLED', 'ATTENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────
-- 3. GymClass table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "gp_gym_class" (
    "id"          TEXT          NOT NULL,
    "tenantId"    TEXT          NOT NULL,
    "name"        TEXT          NOT NULL,
    "description" TEXT,
    "trainerName" TEXT,
    "dayOfWeek"   INTEGER[]     NOT NULL DEFAULT '{}',
    "startTime"   TEXT          NOT NULL,
    "endTime"     TEXT          NOT NULL,
    "maxCapacity" INTEGER       NOT NULL DEFAULT 20,
    "isActive"    BOOLEAN       NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gp_gym_class_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gp_gym_class_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gp_gym_class_tenantId_idx" ON "gp_gym_class"("tenantId");

-- ─────────────────────────────────────────────
-- 4. GymClassBooking table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "gp_gym_class_booking" (
    "id"        TEXT                  NOT NULL,
    "classId"   TEXT                  NOT NULL,
    "memberId"  TEXT                  NOT NULL,
    "date"      TIMESTAMP(3)          NOT NULL,
    "status"    "ClassBookingStatus"  NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gp_gym_class_booking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gp_gym_class_booking_classId_memberId_date_key" UNIQUE ("classId", "memberId", "date"),
    CONSTRAINT "gp_gym_class_booking_classId_fkey"
        FOREIGN KEY ("classId") REFERENCES "gp_gym_class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gp_gym_class_booking_memberId_fkey"
        FOREIGN KEY ("memberId") REFERENCES "gp_member"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gp_gym_class_booking_memberId_idx"  ON "gp_gym_class_booking"("memberId");
CREATE INDEX IF NOT EXISTS "gp_gym_class_booking_classId_date_idx" ON "gp_gym_class_booking"("classId", "date");
