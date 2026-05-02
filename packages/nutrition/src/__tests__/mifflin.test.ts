import { describe, it, expect } from 'vitest';
import { bmrMifflinStJeor, tdee, computeCalorieTarget } from '../mifflin.js';

describe('bmrMifflinStJeor', () => {
  it('computes BMR for a 30yo woman 165cm 70kg', () => {
    const bmr = bmrMifflinStJeor({ weightKg: 70, heightCm: 165, age: 30, sex: 'female' });
    expect(Math.round(bmr)).toBe(1420);
  });
  it('computes BMR for a 30yo man 180cm 80kg', () => {
    const bmr = bmrMifflinStJeor({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' });
    expect(Math.round(bmr)).toBe(1780);
  });
});

describe('tdee', () => {
  it('multiplies BMR by activity factor', () => {
    expect(Math.round(tdee(1500, 'sedentary'))).toBe(1800);
    expect(Math.round(tdee(1500, 'moderate'))).toBe(2325);
  });
});

describe('computeCalorieTarget', () => {
  it('caps weekly loss at 1% body weight', () => {
    const r = computeCalorieTarget({
      age: 30,
      sex: 'female',
      heightCm: 165,
      weightKg: 80,
      activityLevel: 'light',
      weightStartKg: 80,
      weightGoalKg: 60,
      goalMonths: 3,
    });
    expect(r.cappedToOnePercent).toBe(true);
    expect(r.weeklyLossKgCapped).toBeLessThanOrEqual(0.81);
  });
  it('floors target at female minimum', () => {
    const r = computeCalorieTarget({
      age: 30,
      sex: 'female',
      heightCm: 150,
      weightKg: 50,
      activityLevel: 'sedentary',
      weightStartKg: 50,
      weightGoalKg: 45,
      goalMonths: 1,
    });
    expect(r.dailyTarget).toBeGreaterThanOrEqual(1200);
  });
  it('produces sane macros that sum to target', () => {
    const r = computeCalorieTarget({
      age: 30,
      sex: 'female',
      heightCm: 165,
      weightKg: 70,
      activityLevel: 'light',
      weightStartKg: 70,
      weightGoalKg: 65,
      goalMonths: 4,
    });
    const macroKcal = r.proteinG * 4 + r.carbsG * 4 + r.fatG * 9;
    expect(Math.abs(macroKcal - r.dailyTarget)).toBeLessThan(50);
  });
});
