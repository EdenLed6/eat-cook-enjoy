export type DietMethod =
  | 'mediterranean'
  | 'mediterranean_if_16_8'
  | 'mediterranean_calisthenics'
  | 'mediterranean_if_calisthenics'
  | 'keto'
  | 'walking_only';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type Sex = 'female' | 'male' | 'other';

export interface MedicalFlags {
  pregnant?: boolean;
  nursing?: boolean;
  diabetes_t1?: boolean;
  diabetes_t2?: boolean;
  ed_history?: boolean;
  cardiac?: boolean;
  kidney?: boolean;
  other?: string;
}

export interface FastingWindow {
  start: string;
  end: string;
}

export interface MealItem {
  name: string;
  grams?: number;
  kcal: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  confidence?: number;
}

export interface MealAnalysis {
  items: MealItem[];
  total_kcal: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  description: string;
  confidence: number;
  notes?: string;
}

export interface TodaySummary {
  date: string;
  consumed_kcal: number;
  target_kcal: number;
  remaining_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  water_target_ml: number;
  steps: number;
  steps_target: number;
  workouts_minutes: number;
  workouts_kcal_burned: number;
  weight_kg: number | null;
  meals_count: number;
}

export interface ProgressPoint {
  date: string;
  weight_kg?: number;
  consumed_kcal?: number;
  burned_kcal?: number;
  steps?: number;
  water_ml?: number;
}

export type ToolName =
  | 'log_meal'
  | 'log_meal_from_photo'
  | 'log_weight'
  | 'log_water'
  | 'log_workout'
  | 'log_steps_manual'
  | 'log_wolt_order'
  | 'get_today_summary'
  | 'get_progress'
  | 'suggest_meal'
  | 'search_recipes'
  | 'set_reminder'
  | 'remember'
  | 'update_profile'
  | 'compute_calorie_target';

export interface AgentContext {
  userId: string;
  phoneJid: string;
  timezone: string;
  locale: string;
}
