-- Phase 4: AI Diet Plans + AI Workout Plans
-- Safe: new tables only, no destructive changes

CREATE TABLE "gp_fitness_ai_diet_plan" (
    "id"            TEXT          NOT NULL,
    "profileId"     TEXT          NOT NULL,
    "generatedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goal"          TEXT          NOT NULL,
    "weightKg"      DOUBLE PRECISION,
    "heightCm"      DOUBLE PRECISION,
    "activityLevel" TEXT,
    "dietPref"      TEXT,
    "planJson"      JSONB         NOT NULL,

    CONSTRAINT "gp_fitness_ai_diet_plan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gp_fitness_ai_diet_plan_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "gp_fitness_profile"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "gp_fitness_ai_diet_plan_profileId_generatedAt_idx"
    ON "gp_fitness_ai_diet_plan"("profileId", "generatedAt");

CREATE TABLE "gp_fitness_ai_workout_plan" (
    "id"            TEXT          NOT NULL,
    "profileId"     TEXT          NOT NULL,
    "generatedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goal"          TEXT          NOT NULL,
    "fitnessLevel"  TEXT,
    "daysPerWeek"   INTEGER,
    "equipment"     TEXT,
    "planJson"      JSONB         NOT NULL,

    CONSTRAINT "gp_fitness_ai_workout_plan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gp_fitness_ai_workout_plan_profileId_fkey"
        FOREIGN KEY ("profileId") REFERENCES "gp_fitness_profile"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "gp_fitness_ai_workout_plan_profileId_generatedAt_idx"
    ON "gp_fitness_ai_workout_plan"("profileId", "generatedAt");
