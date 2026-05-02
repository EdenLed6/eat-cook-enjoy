import { getDb, profiles, weights, eq, desc } from '@eat/db';
import { computeCalorieTarget } from '@eat/nutrition';
import type { ToolDefinition } from './types.js';

export const updateProfileTool: ToolDefinition = {
  name: 'update_profile',
  description: 'מעדכן שדות בפרופיל המשתמשת. השתמשי כאשר היא מציינת מידע חדש (גובה, יעדים, העדפות, אלרגיות חדשות).',
  input_schema: {
    type: 'object',
    properties: {
      age: { type: 'number' },
      height_cm: { type: 'number' },
      weight_goal_kg: { type: 'number' },
      activity_level: { type: 'string', enum: ['sedentary', 'light', 'moderate', 'active'] },
      diet_method: { type: 'string' },
      daily_water_ml: { type: 'number' },
      daily_steps_target: { type: 'number' },
      cuisine_prefs: { type: 'array', items: { type: 'string' } },
      dislikes: { type: 'array', items: { type: 'string' } },
      allergies: { type: 'array', items: { type: 'string' } },
      kosher: { type: 'boolean' },
    },
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (input.age != null) set.age = input.age;
    if (input.height_cm != null) set.heightCm = String(input.height_cm);
    if (input.weight_goal_kg != null) set.weightGoalKg = String(input.weight_goal_kg);
    if (input.activity_level) set.activityLevel = input.activity_level;
    if (input.diet_method) set.dietMethod = input.diet_method;
    if (input.daily_water_ml != null) set.dailyWaterMl = input.daily_water_ml;
    if (input.daily_steps_target != null) set.dailyStepsTarget = input.daily_steps_target;
    if (input.cuisine_prefs) set.cuisinePrefs = input.cuisine_prefs;
    if (input.dislikes) set.dislikes = input.dislikes;
    if (input.allergies) set.allergies = input.allergies;
    if (input.kosher != null) set.kosher = input.kosher;

    await db.update(profiles).set(set).where(eq(profiles.userId, ctx.userId));
    return { ok: true };
  },
};

export const computeCalorieTargetTool: ToolDefinition = {
  name: 'compute_calorie_target',
  description: 'מחשב מחדש את יעד הקלוריות היומי לפי המשקל הנוכחי והגיל/גובה/יעד.',
  input_schema: { type: 'object', properties: {} },
  async execute(_input, ctx) {
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId));
    if (!profile) return { error: 'no profile' };
    const [latestWeight] = await db
      .select()
      .from(weights)
      .where(eq(weights.userId, ctx.userId))
      .orderBy(desc(weights.measuredOn))
      .limit(1);
    const currentWeight = Number(latestWeight?.weightKg ?? profile.weightStartKg ?? 70);
    const startWeight = Number(profile.weightStartKg ?? currentWeight);
    const goalWeight = Number(profile.weightGoalKg ?? currentWeight - 5);
    const goalDate = profile.goalDate ? new Date(profile.goalDate) : null;
    const months = goalDate
      ? Math.max(
          1,
          Math.round((goalDate.getTime() - Date.now()) / (30 * 86400_000)),
        )
      : 6;

    const result = computeCalorieTarget({
      age: profile.age ?? 30,
      sex: (profile.sex ?? 'female') as 'female' | 'male',
      heightCm: Number(profile.heightCm ?? 165),
      weightKg: currentWeight,
      activityLevel: (profile.activityLevel ?? 'light') as 'sedentary' | 'light' | 'moderate' | 'active',
      weightStartKg: startWeight,
      weightGoalKg: goalWeight,
      goalMonths: months,
    });
    await db
      .update(profiles)
      .set({
        dailyCalorieTarget: result.dailyTarget,
        proteinTargetG: result.proteinG,
        carbsTargetG: result.carbsG,
        fatTargetG: result.fatG,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, ctx.userId));
    return { ok: true, ...result };
  },
};
