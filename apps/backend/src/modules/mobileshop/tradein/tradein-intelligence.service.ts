import { Injectable } from '@nestjs/common';

/**
 * Condition check keys and their scoring weights.
 * Positive = issue present (subtracts from score).
 * key: conditionChecks field name
 * weight: how much this issue hurts the device value (0-1)
 */
const CONDITION_WEIGHTS: Record<string, { label: string; weight: number; isDefect: boolean }> = {
  screenCracked:       { label: 'Screen Cracked',         weight: 0.25, isDefect: true },
  bodyDamaged:         { label: 'Body/Frame Damaged',      weight: 0.10, isDefect: true },
  batteryIssue:        { label: 'Battery Issue',           weight: 0.10, isDefect: true },
  waterDamage:         { label: 'Water Damage',            weight: 0.20, isDefect: true },
  // Working items — true means working (good)
  cameraWorking:       { label: 'Camera Working',          weight: 0.08, isDefect: false },
  chargingWorking:     { label: 'Charging Port Working',   weight: 0.08, isDefect: false },
  speakerWorking:      { label: 'Speaker Working',         weight: 0.04, isDefect: false },
  micWorking:          { label: 'Mic Working',             weight: 0.04, isDefect: false },
  fingerprintWorking:  { label: 'Fingerprint Working',     weight: 0.05, isDefect: false },
  wifiWorking:         { label: 'WiFi Working',            weight: 0.06, isDefect: false },
};

export type TradeInGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'JUNK';

interface GradeResult {
  grade: TradeInGrade;
  score: number; // 0-100
  deductions: Array<{ label: string; deduction: number }>;
  valuationMultiplier: number; // % of market value to offer
  gradeLabel: string;
  recommendation: string;
}

@Injectable()
export class TradeInIntelligenceService {
  /**
   * Auto-grade a device based on condition checks.
   * conditionChecks: { [key]: boolean }
   * Returns grade, score, and suggested valuation multiplier.
   */
  autoGrade(conditionChecks: Record<string, boolean>): GradeResult {
    let score = 100;
    const deductions: Array<{ label: string; deduction: number }> = [];

    for (const [key, meta] of Object.entries(CONDITION_WEIGHTS)) {
      const value = conditionChecks[key];
      if (meta.isDefect && value === true) {
        // Defect present → deduct
        const deduction = meta.weight * 100;
        score -= deduction;
        deductions.push({ label: meta.label, deduction });
      } else if (!meta.isDefect && value === false) {
        // Feature NOT working → deduct
        const deduction = meta.weight * 100;
        score -= deduction;
        deductions.push({ label: `${meta.label} (not working)`, deduction });
      }
    }

    score = Math.max(0, Math.round(score));
    const grade = this.scoreToGrade(score);

    return {
      grade,
      score,
      deductions,
      valuationMultiplier: this.gradeToMultiplier(grade),
      gradeLabel: this.gradeLabel(grade),
      recommendation: this.gradeRecommendation(grade),
    };
  }

  /**
   * Suggest an offered value based on market value and grade.
   */
  suggestValue(marketValueRupees: number, grade: TradeInGrade): number {
    const multiplier = this.gradeToMultiplier(grade);
    return Math.round(marketValueRupees * multiplier);
  }

  private scoreToGrade(score: number): TradeInGrade {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 55) return 'FAIR';
    if (score >= 30) return 'POOR';
    return 'JUNK';
  }

  private gradeToMultiplier(grade: TradeInGrade): number {
    switch (grade) {
      case 'EXCELLENT': return 0.80;
      case 'GOOD':      return 0.65;
      case 'FAIR':      return 0.50;
      case 'POOR':      return 0.30;
      case 'JUNK':      return 0.10;
    }
  }

  private gradeLabel(grade: TradeInGrade): string {
    switch (grade) {
      case 'EXCELLENT': return 'Excellent (Like New)';
      case 'GOOD':      return 'Good (Minor Wear)';
      case 'FAIR':      return 'Fair (Visible Damage)';
      case 'POOR':      return 'Poor (Heavy Damage)';
      case 'JUNK':      return 'Junk (Parts Only)';
    }
  }

  private gradeRecommendation(grade: TradeInGrade): string {
    switch (grade) {
      case 'EXCELLENT': return 'Accept and resell as-is. High demand in used market.';
      case 'GOOD':      return 'Light cleaning/refurbishment before resale.';
      case 'FAIR':      return 'Screen or body repair recommended before resale.';
      case 'POOR':      return 'Major repair or sell for parts. Price accordingly.';
      case 'JUNK':      return 'Parts harvest only. Very limited resale value.';
    }
  }
}
