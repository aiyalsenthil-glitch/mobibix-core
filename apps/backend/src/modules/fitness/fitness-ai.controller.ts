import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { FitnessJwtGuard } from './guards/fitness-jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AiCoreClient } from '../../core/ai/ai-core.client';

const RATE_LIMIT_DAYS = 7; // Pro: 1 generation per 7 days

function isPro(tier: string, proExpiresAt: Date | null): boolean {
  return tier === 'PRO' && (proExpiresAt === null || proExpiresAt > new Date());
}

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / 86400000;
}

@Controller('fitness/ai')
@Public()
@SkipSubscriptionCheck()
@UseGuards(FitnessJwtGuard)
export class FitnessAiController {
  private readonly logger = new Logger(FitnessAiController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiCore: AiCoreClient,
  ) {}

  // ──────────────────────────────────────────────────────────
  //  DIET PLAN
  // ──────────────────────────────────────────────────────────

  /**
   * POST /fitness/ai/diet
   * Generate a 7-day personalized meal plan. Pro only, rate-limited to 1/7d.
   */
  @Post('diet')
  async generateDietPlan(
    @Req() req: any,
    @Body() body: {
      goal?: string;
      weightKg?: number;
      heightCm?: number;
      activityLevel?: string; // SEDENTARY | LIGHT | MODERATE | ACTIVE
      dietPref?: string;      // VEG | NON_VEG | VEGAN
    },
  ) {
    const { fitnessProfileId } = req.user;
    await this.assertPro(fitnessProfileId);

    // Rate limit check
    const last = await this.prisma.fitnessAiDietPlan.findFirst({
      where: { profileId: fitnessProfileId },
      orderBy: { generatedAt: 'desc' },
      select: { generatedAt: true },
    });
    if (last && daysSince(last.generatedAt) < RATE_LIMIT_DAYS) {
      const daysLeft = Math.ceil(RATE_LIMIT_DAYS - daysSince(last.generatedAt));
      throw new ForbiddenException(
        `Diet plan can be regenerated in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Last generated: ${last.generatedAt.toLocaleDateString('en-IN')}.`,
      );
    }

    // Get latest metrics if not provided
    const metric = await this.prisma.fitnessBodyMetric.findFirst({
      where: { profileId: fitnessProfileId },
      orderBy: { date: 'desc' },
      select: { weightKg: true, heightCm: true },
    });
    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { id: fitnessProfileId },
      select: { goalType: true, fullName: true },
    });

    const weightKg = body.weightKg ?? metric?.weightKg ?? null;
    const heightCm = body.heightCm ?? metric?.heightCm ?? null;
    const goal = body.goal ?? profile?.goalType ?? 'GENERAL_FITNESS';
    const activityLevel = body.activityLevel ?? 'MODERATE';
    const dietPref = body.dietPref ?? 'NON_VEG';

    const bmi = weightKg && heightCm ? (weightKg / Math.pow(heightCm / 100, 2)).toFixed(1) : null;
    const calories = this.estimateCalories(weightKg, heightCm, goal, activityLevel);

    const prompt = `You are a professional nutritionist. Create a detailed 7-day meal plan for an Indian fitness member.

Profile:
- Goal: ${goal}
- Weight: ${weightKg ? `${weightKg} kg` : 'unknown'}
- Height: ${heightCm ? `${heightCm} cm` : 'unknown'}
- BMI: ${bmi ?? 'unknown'}
- Activity Level: ${activityLevel}
- Diet Preference: ${dietPref}
- Target Calories: ~${calories} kcal/day

Rules:
1. Use Indian foods (dal, roti, rice, sabzi, paneer, chicken, eggs, etc.)
2. Include breakfast, lunch, dinner, and 2 snacks per day
3. Each meal must have estimated calories and macros (protein/carbs/fat in grams)
4. Keep it practical — foods available in Indian grocery stores

Respond ONLY with a valid JSON object in this exact format:
{
  "targetCalories": number,
  "macros": { "proteinG": number, "carbsG": number, "fatG": number },
  "days": [
    {
      "day": "Monday",
      "meals": [
        { "type": "Breakfast", "items": ["item1", "item2"], "calories": number, "protein": number, "carbs": number, "fat": number },
        { "type": "Mid-Morning Snack", "items": [...], "calories": number, "protein": number, "carbs": number, "fat": number },
        { "type": "Lunch", "items": [...], "calories": number, "protein": number, "carbs": number, "fat": number },
        { "type": "Evening Snack", "items": [...], "calories": number, "protein": number, "carbs": number, "fat": number },
        { "type": "Dinner", "items": [...], "calories": number, "protein": number, "carbs": number, "fat": number }
      ]
    }
    // ... 7 days total
  ],
  "tips": ["tip1", "tip2", "tip3"]
}`;

    const planJson = await this.callAiCore(prompt);

    const saved = await this.prisma.fitnessAiDietPlan.create({
      data: {
        id: `fadp_${Date.now().toString(36)}`,
        profileId: fitnessProfileId,
        goal,
        weightKg,
        heightCm,
        activityLevel,
        dietPref,
        planJson: planJson as any,
      },
    });

    return { id: saved.id, generatedAt: saved.generatedAt, plan: planJson };
  }

  /**
   * GET /fitness/ai/diet/latest
   */
  @Get('diet/latest')
  async getLatestDietPlan(@Req() req: any) {
    const { fitnessProfileId } = req.user;
    await this.assertPro(fitnessProfileId);

    const plan = await this.prisma.fitnessAiDietPlan.findFirst({
      where: { profileId: fitnessProfileId },
      orderBy: { generatedAt: 'desc' },
    });

    if (!plan) return null;

    const daysUntilRefresh = Math.max(
      0,
      Math.ceil(RATE_LIMIT_DAYS - daysSince(plan.generatedAt)),
    );

    return { id: plan.id, generatedAt: plan.generatedAt, plan: plan.planJson, daysUntilRefresh };
  }

  // ──────────────────────────────────────────────────────────
  //  WORKOUT PLAN
  // ──────────────────────────────────────────────────────────

  /**
   * POST /fitness/ai/workout
   * Generate a weekly workout split. Pro only, rate-limited to 1/7d.
   */
  @Post('workout')
  async generateWorkoutPlan(
    @Req() req: any,
    @Body() body: {
      goal?: string;
      fitnessLevel?: string; // BEGINNER | INTERMEDIATE | ADVANCED
      daysPerWeek?: number;
      equipment?: string;    // NONE | BASIC | GYM
    },
  ) {
    const { fitnessProfileId } = req.user;
    await this.assertPro(fitnessProfileId);

    // Rate limit check
    const last = await this.prisma.fitnessAiWorkoutPlan.findFirst({
      where: { profileId: fitnessProfileId },
      orderBy: { generatedAt: 'desc' },
      select: { generatedAt: true },
    });
    if (last && daysSince(last.generatedAt) < RATE_LIMIT_DAYS) {
      const daysLeft = Math.ceil(RATE_LIMIT_DAYS - daysSince(last.generatedAt));
      throw new ForbiddenException(
        `Workout plan can be regenerated in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Last generated: ${last.generatedAt.toLocaleDateString('en-IN')}.`,
      );
    }

    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { id: fitnessProfileId },
      select: { goalType: true },
    });

    const goal = body.goal ?? profile?.goalType ?? 'GENERAL_FITNESS';
    const fitnessLevel = body.fitnessLevel ?? 'BEGINNER';
    const daysPerWeek = body.daysPerWeek ?? 4;
    const equipment = body.equipment ?? 'GYM';

    const prompt = `You are a certified personal trainer. Create a ${daysPerWeek}-day weekly workout split for an Indian gym member.

Profile:
- Goal: ${goal}
- Fitness Level: ${fitnessLevel}
- Days Per Week: ${daysPerWeek}
- Equipment: ${equipment} (NONE = bodyweight only, BASIC = dumbbells/bands, GYM = full gym)

Rules:
1. Each workout day must have a focus (e.g. Chest & Triceps, Back & Biceps, Legs, etc.)
2. Include 4-6 exercises per day with sets, reps, and rest time
3. Include warm-up and cool-down
4. Rest days should be marked as REST with active recovery tips
5. Difficulty appropriate for ${fitnessLevel}

Respond ONLY with a valid JSON object in this exact format:
{
  "split": "Push Pull Legs",
  "weeklySchedule": [
    {
      "day": "Monday",
      "focus": "Chest & Triceps",
      "isRest": false,
      "warmUp": ["5 min treadmill", "arm circles"],
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10", "rest": "90 sec", "notes": "Keep elbows at 45°" }
      ],
      "coolDown": ["chest stretch", "tricep stretch"]
    }
    // ... all 7 days (including rest days)
  ],
  "tips": ["tip1", "tip2"],
  "progressionNote": "Increase weight by 5% every 2 weeks"
}`;

    const planJson = await this.callAiCore(prompt);

    const saved = await this.prisma.fitnessAiWorkoutPlan.create({
      data: {
        id: `fawp_${Date.now().toString(36)}`,
        profileId: fitnessProfileId,
        goal,
        fitnessLevel,
        daysPerWeek,
        equipment,
        planJson: planJson as any,
      },
    });

    return { id: saved.id, generatedAt: saved.generatedAt, plan: planJson };
  }

  /**
   * GET /fitness/ai/workout/latest
   */
  @Get('workout/latest')
  async getLatestWorkoutPlan(@Req() req: any) {
    const { fitnessProfileId } = req.user;
    await this.assertPro(fitnessProfileId);

    const plan = await this.prisma.fitnessAiWorkoutPlan.findFirst({
      where: { profileId: fitnessProfileId },
      orderBy: { generatedAt: 'desc' },
    });

    if (!plan) return null;

    const daysUntilRefresh = Math.max(
      0,
      Math.ceil(RATE_LIMIT_DAYS - daysSince(plan.generatedAt)),
    );

    return { id: plan.id, generatedAt: plan.generatedAt, plan: plan.planJson, daysUntilRefresh };
  }

  // ──────────────────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────────────────

  private async assertPro(profileId: string) {
    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { id: profileId },
      select: { tier: true, proExpiresAt: true },
    });
    if (!profile || !isPro(profile.tier, profile.proExpiresAt)) {
      throw new ForbiddenException('AI Plans are a Pro feature. Upgrade to Pro to unlock personalized diet and workout plans.');
    }
  }

  private estimateCalories(
    weightKg: number | null,
    heightCm: number | null,
    goal: string,
    activity: string,
  ): number {
    // Simple Mifflin-St Jeor estimate (assume male 25y as default)
    const bmr = weightKg && heightCm
      ? 10 * weightKg + 6.25 * heightCm - 5 * 25 + 5
      : 2000;

    const activityFactor: Record<string, number> = {
      SEDENTARY: 1.2,
      LIGHT: 1.375,
      MODERATE: 1.55,
      ACTIVE: 1.725,
    };

    const tdee = bmr * (activityFactor[activity] ?? 1.55);

    if (goal === 'WEIGHT_LOSS') return Math.round(tdee - 400);
    if (goal === 'MUSCLE_GAIN' || goal === 'WEIGHT_GAIN') return Math.round(tdee + 300);
    return Math.round(tdee);
  }

  private async callAiCore(prompt: string): Promise<unknown> {
    try {
      const result = await this.aiCore.sendTask({
        tenantJwt: 'system',
        agentRole: 'fitness-advisor',
        message: prompt,
        context: { outputFormat: 'json' },
      });

      // Parse JSON from ai-core response string
      const text = result.response?.trim() ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI returned non-JSON response');
      return JSON.parse(jsonMatch[0]);
    } catch (err: any) {
      this.logger.error('AI Core call failed', err?.message);
      throw new ServiceUnavailableException(
        'AI service is temporarily unavailable. Please try again in a few minutes.',
      );
    }
  }
}
