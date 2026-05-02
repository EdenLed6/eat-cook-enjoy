import { getDb, workouts, weights, profiles, eq, desc } from '@eat/db';
import { estimateKcalBurned } from '@eat/nutrition';
import type { ToolDefinition } from './types.js';

export const logWorkoutTool: ToolDefinition = {
  name: 'log_workout',
  description: 'מתעד אימון/הליכה. מחשב הערכת קלוריות שנשרפו לפי המשקל הנוכחי של המשתמשת.',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'סוג: walk / brisk_walk / run / cycle / swim / yoga / pilates / calisthenics / weights / hiit / dance / generic',
      },
      duration_min: { type: 'number' },
      intensity: { type: 'string', enum: ['low', 'moderate', 'high'] },
      started_at_iso: { type: 'string' },
      notes: { type: 'string' },
    },
    required: ['type', 'duration_min'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const [latestWeight] = await db
      .select()
      .from(weights)
      .where(eq(weights.userId, ctx.userId))
      .orderBy(desc(weights.measuredOn))
      .limit(1);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId));
    const weightKg = Number(
      latestWeight?.weightKg ?? profile?.weightStartKg ?? 70,
    );
    const kcal = estimateKcalBurned({
      type: input.type,
      durationMin: input.duration_min,
      weightKg,
      intensity: input.intensity,
    });
    const startedAt = input.started_at_iso ? new Date(input.started_at_iso) : new Date();
    await db.insert(workouts).values({
      userId: ctx.userId,
      startedAt,
      type: input.type,
      durationMin: Math.round(input.duration_min),
      intensity: input.intensity ?? null,
      estKcalBurned: kcal,
      notes: input.notes ?? null,
    });
    return { ok: true, est_kcal_burned: kcal };
  },
};
