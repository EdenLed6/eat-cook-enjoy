import { z } from 'zod';

export const mealItemSchema = z.object({
  name: z.string(),
  grams: z.number().optional(),
  kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const mealAnalysisSchema = z.object({
  items: z.array(mealItemSchema),
  total_kcal: z.number().nonnegative(),
  total_protein_g: z.number().nonnegative(),
  total_carbs_g: z.number().nonnegative(),
  total_fat_g: z.number().nonnegative(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export const onboardingAnswersSchema = z.object({
  display_name: z.string().min(1).max(50),
  age: z.number().int().min(12).max(95),
  height_cm: z.number().min(120).max(220),
  weight_start_kg: z.number().min(30).max(250),
  weight_goal_kg: z.number().min(30).max(250),
  goal_months: z.number().min(1).max(24),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active']),
  allergies: z.array(z.string()).default([]),
  dislikes: z.array(z.string()).default([]),
  kosher: z.boolean().default(false),
  cuisine_prefs: z.array(z.string()).default([]),
  medical_flags: z
    .object({
      pregnant: z.boolean().optional(),
      nursing: z.boolean().optional(),
      diabetes_t1: z.boolean().optional(),
      diabetes_t2: z.boolean().optional(),
      ed_history: z.boolean().optional(),
      cardiac: z.boolean().optional(),
      kidney: z.boolean().optional(),
    })
    .default({}),
  meal_times: z
    .object({
      breakfast: z.string().optional(),
      dinner: z.string().optional(),
    })
    .default({}),
  daily_activity_minutes: z.number().min(0).max(240).default(30),
  injuries: z.string().default(''),
});

export type OnboardingAnswers = z.infer<typeof onboardingAnswersSchema>;
