import { getDb, eq, and, gte, desc, sql } from '@eat/db';
import { meals, weights, waterLog, stepsDaily, workouts } from '@eat/db';
import { getTodaySummary } from '../memory.js';
import type { ToolDefinition } from './types.js';

export const getTodaySummaryTool: ToolDefinition = {
  name: 'get_today_summary',
  description: 'מחזיר את סיכום היום הנוכחי: קלוריות שנצרכו/יעד, מים, צעדים, אימונים.',
  input_schema: { type: 'object', properties: {} },
  async execute(_input, ctx) {
    return getTodaySummary(ctx.userId, ctx.timezone);
  },
};

export const getProgressTool: ToolDefinition = {
  name: 'get_progress',
  description: 'מחזיר נתוני התקדמות לטווח של שבוע או חודש.',
  input_schema: {
    type: 'object',
    properties: {
      range: { type: 'string', enum: ['week', 'month'] },
    },
    required: ['range'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const days = input.range === 'month' ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceDate = since.toISOString().slice(0, 10);

    const weightRows = await db
      .select()
      .from(weights)
      .where(and(eq(weights.userId, ctx.userId), gte(weights.measuredOn, sinceDate)))
      .orderBy(desc(weights.measuredOn));

    const stepRows = await db
      .select()
      .from(stepsDaily)
      .where(and(eq(stepsDaily.userId, ctx.userId), gte(stepsDaily.onDate, sinceDate)))
      .orderBy(desc(stepsDaily.onDate));

    const mealAgg = await db
      .select({
        date: sql<string>`date_trunc('day', ${meals.consumedAt} AT TIME ZONE ${ctx.timezone})::date::text`,
        total_kcal: sql<number>`coalesce(sum(${meals.totalKcal})::int, 0)`,
      })
      .from(meals)
      .where(and(eq(meals.userId, ctx.userId), gte(meals.consumedAt, since)))
      .groupBy(
        sql`date_trunc('day', ${meals.consumedAt} AT TIME ZONE ${ctx.timezone})::date`,
      );

    return {
      range: input.range,
      weights: weightRows.map((r) => ({ date: r.measuredOn, weight_kg: Number(r.weightKg) })),
      steps: stepRows.map((r) => ({ date: r.onDate, steps: r.steps })),
      kcal_per_day: mealAgg,
    };
  },
};
