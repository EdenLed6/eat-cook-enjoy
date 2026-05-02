import { getDb, eq } from '@eat/db';
import { onboardingState, profiles, users, weights } from '@eat/db';
import { he } from '@eat/shared';
import { selectDietMethod, computeCalorieTarget } from '@eat/nutrition';
import type { WASocket } from '@whiskeysockets/baileys';
import { sendText } from '../baileys/send.js';

const STEPS = [
  'name',
  'age',
  'height',
  'weight_start',
  'weight_goal',
  'goal_months',
  'activity',
  'allergies',
  'dislikes',
  'kosher',
  'cuisine',
  'safety',
  'meal_times',
  'daily_minutes',
  'injuries',
  'done',
] as const;
type StepId = (typeof STEPS)[number];

const PROMPTS: Record<StepId, string> = {
  name: he.onboarding.q_name,
  age: he.onboarding.q_age,
  height: he.onboarding.q_height,
  weight_start: he.onboarding.q_weight_start,
  weight_goal: he.onboarding.q_weight_goal,
  goal_months: he.onboarding.q_goal_months,
  activity: he.onboarding.q_activity,
  allergies: he.onboarding.q_allergies,
  dislikes: he.onboarding.q_dislikes,
  kosher: he.onboarding.q_kosher,
  cuisine: he.onboarding.q_cuisine,
  safety: he.onboarding.q_safety,
  meal_times: he.onboarding.q_meal_times,
  daily_minutes: he.onboarding.q_daily_minutes,
  injuries: he.onboarding.q_injuries,
  done: '',
};

export async function isOnboardingActive(userId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db.select().from(onboardingState).where(eq(onboardingState.userId, userId));
  return !!row && !row.completedAt;
}

export async function startOnboarding(
  sock: WASocket,
  userId: string,
  jid: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(onboardingState)
    .values({ userId, step: 'name', answers: {} })
    .onConflictDoUpdate({
      target: onboardingState.userId,
      set: { step: 'name', answers: {}, startedAt: new Date(), completedAt: null },
    });
  await sendText(sock, userId, jid, he.onboarding.intro);
  await sendText(sock, userId, jid, PROMPTS.name);
}

export async function handleOnboardingMessage(
  sock: WASocket,
  userId: string,
  jid: string,
  text: string,
): Promise<void> {
  const db = getDb();
  const [row] = await db.select().from(onboardingState).where(eq(onboardingState.userId, userId));
  if (!row) return;
  const currentStep = row.step as StepId;
  const answers = (row.answers as Record<string, unknown>) ?? {};

  const trimmed = text.trim();

  let next: StepId | null = null;
  let errorMsg: string | null = null;

  switch (currentStep) {
    case 'name':
      if (trimmed.length < 1 || trimmed.length > 50) errorMsg = 'שם קצר מדי או ארוך מדי. נסי שוב.';
      else {
        answers.display_name = trimmed;
        next = 'age';
      }
      break;
    case 'age': {
      const v = Number(trimmed);
      if (Number.isNaN(v) || v < 12 || v > 95) errorMsg = 'גיל לא תקני. הקלידי מספר בין 12 ל-95.';
      else {
        answers.age = v;
        next = 'height';
      }
      break;
    }
    case 'height': {
      const v = Number(trimmed);
      if (Number.isNaN(v) || v < 120 || v > 220) errorMsg = 'גובה לא תקני. הקלידי בס״מ (120-220).';
      else {
        answers.height_cm = v;
        next = 'weight_start';
      }
      break;
    }
    case 'weight_start': {
      const v = Number(trimmed);
      if (Number.isNaN(v) || v < 30 || v > 250) errorMsg = 'משקל לא תקני. הקלידי בק״ג (30-250).';
      else {
        answers.weight_start_kg = v;
        next = 'weight_goal';
      }
      break;
    }
    case 'weight_goal': {
      const v = Number(trimmed);
      const start = Number(answers.weight_start_kg);
      if (Number.isNaN(v) || v < 30 || v > 250) errorMsg = 'משקל יעד לא תקני.';
      else if (v >= start) errorMsg = 'יעד המשקל צריך להיות נמוך מהמשקל הנוכחי.';
      else {
        answers.weight_goal_kg = v;
        next = 'goal_months';
      }
      break;
    }
    case 'goal_months': {
      const v = Number(trimmed);
      if (Number.isNaN(v) || v < 1 || v > 24) errorMsg = 'הקלידי מספר חודשים בין 1 ל-24.';
      else {
        answers.goal_months = v;
        next = 'activity';
      }
      break;
    }
    case 'activity': {
      const v = trimmed.match(/[1-4]/)?.[0];
      if (!v) errorMsg = 'בחרי 1, 2, 3 או 4.';
      else {
        answers.activity_level = (
          { '1': 'sedentary', '2': 'light', '3': 'moderate', '4': 'active' } as const
        )[v as '1' | '2' | '3' | '4'];
        next = 'allergies';
      }
      break;
    }
    case 'allergies':
      answers.allergies = parseList(trimmed);
      next = 'dislikes';
      break;
    case 'dislikes':
      answers.dislikes = parseList(trimmed);
      next = 'kosher';
      break;
    case 'kosher':
      answers.kosher = /כן|yes|true|1/.test(trimmed.toLowerCase());
      next = 'cuisine';
      break;
    case 'cuisine':
      answers.cuisine_prefs = parseList(trimmed);
      next = 'safety';
      break;
    case 'safety': {
      const flags: Record<string, boolean> = {};
      const lower = trimmed.toLowerCase();
      flags.pregnant = /הריון|מעוברת/.test(lower);
      flags.nursing = /מניק/.test(lower);
      flags.diabetes_t1 = /סוג ?1|t1|טיפוס ?1/.test(lower);
      flags.diabetes_t2 = /סוכרת|diabet/.test(lower) && !flags.diabetes_t1;
      flags.ed_history = /הפרעת אכילה|אכילה/.test(lower);
      answers.medical_flags = flags;
      next = 'meal_times';
      break;
    }
    case 'meal_times': {
      const breakfast = trimmed.match(/בוקר[^\d]*(\d{1,2}:?\d{0,2})/)?.[1];
      const dinner = trimmed.match(/ערב[^\d]*(\d{1,2}:?\d{0,2})/)?.[1];
      answers.meal_times = {
        breakfast: normalizeTime(breakfast),
        dinner: normalizeTime(dinner),
      };
      next = 'daily_minutes';
      break;
    }
    case 'daily_minutes': {
      const v = Number(trimmed);
      if (Number.isNaN(v) || v < 0 || v > 240) errorMsg = 'הקלידי מספר דקות בין 0 ל-240.';
      else {
        answers.daily_activity_minutes = v;
        next = 'injuries';
      }
      break;
    }
    case 'injuries':
      answers.injuries = trimmed;
      next = 'done';
      break;
    default:
      break;
  }

  if (errorMsg) {
    await sendText(sock, userId, jid, errorMsg);
    return;
  }

  if (next === 'done') {
    await finalizeOnboarding(sock, userId, jid, answers);
    return;
  }

  if (next) {
    await db
      .update(onboardingState)
      .set({ step: next, answers })
      .where(eq(onboardingState.userId, userId));
    await sendText(sock, userId, jid, PROMPTS[next]);
  }
}

async function finalizeOnboarding(
  sock: WASocket,
  userId: string,
  jid: string,
  answers: Record<string, any>,
): Promise<void> {
  const db = getDb();

  const recommendation = selectDietMethod({
    age: answers.age,
    flags: answers.medical_flags ?? {},
    injuries: answers.injuries,
    activityLevel: answers.activity_level,
    mealTimes: answers.meal_times,
    dailyActivityMinutes: answers.daily_activity_minutes ?? 30,
    wantsFastResults: answers.goal_months <= 6,
    explicitlyRequestedKeto: false,
  });

  const calorie = computeCalorieTarget({
    age: answers.age,
    sex: 'female',
    heightCm: answers.height_cm,
    weightKg: answers.weight_start_kg,
    activityLevel: answers.activity_level,
    weightStartKg: answers.weight_start_kg,
    weightGoalKg: answers.weight_goal_kg,
    goalMonths: answers.goal_months,
  });

  const goalDate = new Date();
  goalDate.setMonth(goalDate.getMonth() + answers.goal_months);

  await db
    .update(users)
    .set({ displayName: answers.display_name })
    .where(eq(users.id, userId));

  await db
    .insert(profiles)
    .values({
      userId,
      age: answers.age,
      sex: 'female',
      heightCm: String(answers.height_cm),
      weightStartKg: String(answers.weight_start_kg),
      weightGoalKg: String(answers.weight_goal_kg),
      goalDate: goalDate.toISOString().slice(0, 10),
      activityLevel: answers.activity_level,
      dietMethod: recommendation.method,
      fastingWindow: recommendation.fastingWindow ?? null,
      dailyCalorieTarget: calorie.dailyTarget,
      proteinTargetG: calorie.proteinG,
      carbsTargetG: calorie.carbsG,
      fatTargetG: calorie.fatG,
      cuisinePrefs: answers.cuisine_prefs ?? [],
      dislikes: answers.dislikes ?? [],
      allergies: answers.allergies ?? [],
      kosher: answers.kosher ?? false,
      medicalFlags: answers.medical_flags ?? {},
      injuries: answers.injuries ?? '',
      dailyActivityMinutes: answers.daily_activity_minutes ?? 30,
      onboardedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        age: answers.age,
        heightCm: String(answers.height_cm),
        weightStartKg: String(answers.weight_start_kg),
        weightGoalKg: String(answers.weight_goal_kg),
        goalDate: goalDate.toISOString().slice(0, 10),
        activityLevel: answers.activity_level,
        dietMethod: recommendation.method,
        fastingWindow: recommendation.fastingWindow ?? null,
        dailyCalorieTarget: calorie.dailyTarget,
        proteinTargetG: calorie.proteinG,
        carbsTargetG: calorie.carbsG,
        fatTargetG: calorie.fatG,
        cuisinePrefs: answers.cuisine_prefs ?? [],
        dislikes: answers.dislikes ?? [],
        allergies: answers.allergies ?? [],
        kosher: answers.kosher ?? false,
        medicalFlags: answers.medical_flags ?? {},
        injuries: answers.injuries ?? '',
        dailyActivityMinutes: answers.daily_activity_minutes ?? 30,
        onboardedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  const today = new Date().toISOString().slice(0, 10);
  await db
    .insert(weights)
    .values({ userId, measuredOn: today, weightKg: String(answers.weight_start_kg) })
    .onConflictDoNothing();

  await db
    .update(onboardingState)
    .set({ step: 'done', answers, completedAt: new Date() })
    .where(eq(onboardingState.userId, userId));

  await sendText(sock, userId, jid, he.onboarding.done_intro);
  await sendText(
    sock,
    userId,
    jid,
    he.onboarding.done_method(he.dietMethodNames[recommendation.method] ?? recommendation.method),
  );
  await sendText(sock, userId, jid, recommendation.reasoning);
  if (recommendation.contraindications.length > 0) {
    await sendText(sock, userId, jid, 'הערות בטיחות:\n' + recommendation.contraindications.join('\n'));
  }
  await sendText(sock, userId, jid, he.onboarding.done_calories(calorie.dailyTarget));
  await sendText(
    sock,
    userId,
    jid,
    he.onboarding.done_macros(calorie.proteinG, calorie.carbsG, calorie.fatG),
  );
  await sendText(sock, userId, jid, he.onboarding.done_outro);
}

function parseList(s: string): string[] {
  if (/^(אין|הכל בסדר|לא|none)$/i.test(s.trim())) return [];
  return s
    .split(/[,،;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeTime(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{1,2}):?(\d{0,2})/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (Number.isNaN(h)) return undefined;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
