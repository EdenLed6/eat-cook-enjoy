import type { ActivityLevel, Sex } from '@eat/shared';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const KCAL_PER_KG_FAT = 7700;
const MIN_FEMALE_KCAL = 1200;
const MIN_MALE_KCAL = 1500;

export interface CalorieInputs {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  weightStartKg: number;
  weightGoalKg: number;
  goalMonths: number;
}

export interface CalorieResult {
  bmr: number;
  tdee: number;
  weeklyLossKg: number;
  weeklyLossKgCapped: number;
  cappedToOnePercent: boolean;
  dailyDeficit: number;
  dailyTarget: number;
  flooredToMin: boolean;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function bmrMifflinStJeor(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  if (input.sex === 'male') return base + 5;
  return base - 161;
}

export function tdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTOR[activityLevel];
}

export function computeCalorieTarget(input: CalorieInputs): CalorieResult {
  const bmr = bmrMifflinStJeor({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age: input.age,
    sex: input.sex,
  });
  const total = tdee(bmr, input.activityLevel);

  const totalLossKg = Math.max(0, input.weightStartKg - input.weightGoalKg);
  const weeks = Math.max(1, input.goalMonths * 4.345);
  const requested = totalLossKg / weeks;
  const onePercentCap = input.weightStartKg * 0.01;
  const cappedLoss = Math.min(requested, onePercentCap);
  const cappedToOnePercent = requested > onePercentCap;

  const dailyDeficit = (cappedLoss * KCAL_PER_KG_FAT) / 7;
  const naive = total - dailyDeficit;
  const minByBmr = bmr * 1.1;
  const absoluteMin = input.sex === 'female' ? MIN_FEMALE_KCAL : MIN_MALE_KCAL;
  const minimum = Math.max(minByBmr, absoluteMin);
  const target = Math.round(Math.max(naive, minimum));
  const flooredToMin = naive < minimum;

  const macros = mediterraneanMacros(target);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(total),
    weeklyLossKg: Number(requested.toFixed(2)),
    weeklyLossKgCapped: Number(cappedLoss.toFixed(2)),
    cappedToOnePercent,
    dailyDeficit: Math.round(dailyDeficit),
    dailyTarget: target,
    flooredToMin,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
  };
}

export function mediterraneanMacros(targetKcal: number) {
  const proteinKcal = targetKcal * 0.2;
  const carbsKcal = targetKcal * 0.45;
  const fatKcal = targetKcal * 0.35;
  return {
    proteinG: Math.round(proteinKcal / 4),
    carbsG: Math.round(carbsKcal / 4),
    fatG: Math.round(fatKcal / 9),
  };
}

export function ketoMacros(targetKcal: number) {
  const proteinKcal = targetKcal * 0.25;
  const carbsKcal = targetKcal * 0.05;
  const fatKcal = targetKcal * 0.7;
  return {
    proteinG: Math.round(proteinKcal / 4),
    carbsG: Math.round(carbsKcal / 4),
    fatG: Math.round(fatKcal / 9),
  };
}
