import type { DietMethod, MedicalFlags, ActivityLevel } from '@eat/shared';
import { safetyScreen } from './safety-screen.js';

export interface DietSelectorInput {
  age: number;
  flags: MedicalFlags;
  injuries?: string;
  activityLevel: ActivityLevel;
  mealTimes?: { breakfast?: string; dinner?: string };
  dailyActivityMinutes: number;
  wantsFastResults?: boolean;
  explicitlyRequestedKeto?: boolean;
}

export interface DietRecommendation {
  method: DietMethod;
  fastingWindow?: { start: string; end: string };
  reasoning: string;
  contraindications: string[];
  reviewEveryMonths?: number;
}

function fastingFeasible(times?: { breakfast?: string; dinner?: string }): boolean {
  if (!times?.breakfast || !times?.dinner) return true;
  const bk = parseTime(times.breakfast);
  const dn = parseTime(times.dinner);
  if (bk == null || dn == null) return true;
  return dn - bk <= 8 * 60;
}

function parseTime(s: string): number | null {
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

export function selectDietMethod(input: DietSelectorInput): DietRecommendation {
  const safety = safetyScreen({ age: input.age, flags: input.flags, injuries: input.injuries });

  if (input.explicitlyRequestedKeto && safety.ketoAllowed) {
    return {
      method: 'keto',
      reasoning:
        'בחרת בקיטו במפורש. שיטה יעילה לטווח קצר אך דורשת מעקב — נסקור מחדש בעוד 6 חודשים.',
      contraindications: safety.reasons,
      reviewEveryMonths: 6,
    };
  }

  if (input.flags.pregnant || input.flags.nursing || input.flags.ed_history) {
    return {
      method: 'mediterranean',
      reasoning:
        'מצב רפואי שלך מחייב תזונה מאוזנת ובת-קיימא. ים-תיכונית היא הבחירה הבטוחה והמוכחת ביותר.',
      contraindications: safety.reasons,
    };
  }

  if (input.age >= 60 || (input.injuries && input.injuries.trim() && input.injuries.trim() !== 'אין')) {
    return {
      method: 'walking_only',
      reasoning: 'בהתאם לגיל/מגבלות גופניות — תזונה ים-תיכונית עם הליכה יומית כבסיס בטוח.',
      contraindications: safety.reasons,
    };
  }

  const canFast = safety.fastingAllowed && fastingFeasible(input.mealTimes);
  const canHIIT = safety.highIntensityAllowed;

  if (canFast && canHIIT && input.wantsFastResults && input.dailyActivityMinutes >= 30) {
    return {
      method: 'mediterranean_if_calisthenics',
      fastingWindow: { start: '12:00', end: '20:00' },
      reasoning:
        'שילוב ים-תיכוני + צום 16:8 + קליסטניקס: הוכח כמהיר ובטוח להורדה במשקל ושיפור הרכב גוף.',
      contraindications: [],
    };
  }

  if (canFast && input.wantsFastResults) {
    return {
      method: 'mediterranean_if_16_8',
      fastingWindow: { start: '12:00', end: '20:00' },
      reasoning:
        'ים-תיכוני + צום 16:8: שיטה יעילה ובת-קיימא לרוב הנשים שאין להן קונטרה-אינדיקציות.',
      contraindications: [],
    };
  }

  if (canHIIT && input.dailyActivityMinutes >= 20) {
    return {
      method: 'mediterranean_calisthenics',
      reasoning:
        'תזונה ים-תיכונית + קליסטניקס: השילוב הטוב ביותר במחקר לבריאות בת-קיימא ולהרכב גוף משופר.',
      contraindications: [],
    };
  }

  return {
    method: 'mediterranean',
    reasoning:
      'תזונה ים-תיכונית — הבסיס המוכח ביותר במחקר להורדה במשקל בריאה ובת-קיימא.',
    contraindications: safety.reasons,
  };
}
