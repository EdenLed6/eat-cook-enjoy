import { getDb, eq, and, gte, desc, sql } from '@eat/db';
import {
  conversationMemory,
  meals,
  weights,
  waterLog,
  stepsDaily,
  workouts,
  messages,
  profiles,
} from '@eat/db';
import type { TodaySummary } from '@eat/shared';
import { estimateStepsKcal } from '@eat/nutrition';

export async function getTodaySummary(userId: string, tz = 'Asia/Jerusalem'): Promise<TodaySummary> {
  const db = getDb();
  const todayDate = nowDateInTz(tz);
  const dayStart = startOfDayInTzUtc(todayDate, tz);

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const todayMeals = await db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, userId), gte(meals.consumedAt, dayStart)));

  const todayWater = await db
    .select()
    .from(waterLog)
    .where(and(eq(waterLog.userId, userId), gte(waterLog.loggedAt, dayStart)));

  const [todaySteps] = await db
    .select()
    .from(stepsDaily)
    .where(and(eq(stepsDaily.userId, userId), eq(stepsDaily.onDate, todayDate)));

  const todayWorkouts = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.startedAt, dayStart)));

  const [latestWeight] = await db
    .select()
    .from(weights)
    .where(eq(weights.userId, userId))
    .orderBy(desc(weights.measuredOn))
    .limit(1);

  const consumed_kcal = todayMeals.reduce((s, m) => s + m.totalKcal, 0);
  const protein_g = todayMeals.reduce((s, m) => s + Number(m.proteinG ?? 0), 0);
  const carbs_g = todayMeals.reduce((s, m) => s + Number(m.carbsG ?? 0), 0);
  const fat_g = todayMeals.reduce((s, m) => s + Number(m.fatG ?? 0), 0);
  const water_ml = todayWater.reduce((s, w) => s + w.amountMl, 0);
  const workoutMinutes = todayWorkouts.reduce((s, w) => s + w.durationMin, 0);
  const workoutKcal = todayWorkouts.reduce((s, w) => s + (w.estKcalBurned ?? 0), 0);

  const target_kcal = profile?.dailyCalorieTarget ?? 1800;
  const water_target_ml = profile?.dailyWaterMl ?? 2500;
  const steps_target = profile?.dailyStepsTarget ?? 8000;
  const weightKg = latestWeight ? Number(latestWeight.weightKg) : null;

  const stepsCount = todaySteps?.steps ?? 0;
  const stepsKcal = weightKg ? estimateStepsKcal(stepsCount, weightKg) : 0;

  return {
    date: todayDate,
    consumed_kcal,
    target_kcal,
    remaining_kcal: target_kcal - consumed_kcal,
    protein_g,
    carbs_g,
    fat_g,
    water_ml,
    water_target_ml,
    steps: stepsCount,
    steps_target,
    workouts_minutes: workoutMinutes,
    workouts_kcal_burned: workoutKcal + stepsKcal,
    weight_kg: weightKg,
    meals_count: todayMeals.length,
  };
}

export async function getRecentMemory(userId: string, limit = 10) {
  const db = getDb();
  return db
    .select({ kind: conversationMemory.kind, content: conversationMemory.content })
    .from(conversationMemory)
    .where(eq(conversationMemory.userId, userId))
    .orderBy(desc(conversationMemory.createdAt))
    .limit(limit);
}

export async function getWeeklyWeight(userId: string) {
  const db = getDb();
  const seven = new Date();
  seven.setDate(seven.getDate() - 7);
  const sevenDate = seven.toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(weights)
    .where(and(eq(weights.userId, userId), gte(weights.measuredOn, sevenDate)))
    .orderBy(desc(weights.measuredOn));
  return rows.map((r) => ({ date: r.measuredOn, weight_kg: Number(r.weightKg) }));
}

export async function getRecentMessagesForContext(userId: string, limit = 20) {
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.userId, userId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

function nowDateInTz(tz: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

function startOfDayInTzUtc(dateStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const local = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0));
  const tzOffsetMin = getTzOffsetMin(local, tz);
  return new Date(local.getTime() - tzOffsetMin * 60_000);
}

function getTzOffsetMin(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60_000;
}

export function localTimeStr(tz = 'Asia/Jerusalem'): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

export function nowDateInTzExport(tz = 'Asia/Jerusalem') {
  return nowDateInTz(tz);
}

export function startOfDayUtc(dateStr: string, tz = 'Asia/Jerusalem') {
  return startOfDayInTzUtc(dateStr, tz);
}
