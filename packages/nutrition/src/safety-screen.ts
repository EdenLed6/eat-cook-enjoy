import type { MedicalFlags } from '@eat/shared';

export interface SafetyResult {
  fastingAllowed: boolean;
  ketoAllowed: boolean;
  highIntensityAllowed: boolean;
  reasons: string[];
}

export function safetyScreen(input: {
  age: number;
  flags: MedicalFlags;
  injuries?: string;
}): SafetyResult {
  const reasons: string[] = [];
  let fastingAllowed = true;
  let ketoAllowed = true;
  let highIntensityAllowed = true;

  if (input.flags.pregnant) {
    fastingAllowed = false;
    ketoAllowed = false;
    highIntensityAllowed = false;
    reasons.push('הריון: ללא צום, ללא קיטו, ללא עצימות גבוהה.');
  }
  if (input.flags.nursing) {
    fastingAllowed = false;
    ketoAllowed = false;
    reasons.push('הנקה: ללא צום וללא קיטו (צריכת קלוריות מספקת חיונית).');
  }
  if (input.flags.diabetes_t1) {
    fastingAllowed = false;
    ketoAllowed = false;
    reasons.push('סוכרת סוג 1: ללא צום וללא קיטו ללא ליווי רפואי הדוק.');
  }
  if (input.flags.diabetes_t2) {
    fastingAllowed = false;
    reasons.push('סוכרת סוג 2: צום מצריך התייעצות עם רופא.');
  }
  if (input.flags.ed_history) {
    fastingAllowed = false;
    reasons.push('היסטוריה של הפרעת אכילה: ללא צום, ללא ספירת קלוריות אובססיבית.');
  }
  if (input.flags.cardiac) {
    highIntensityAllowed = false;
    reasons.push('בעיות לב: ללא עצימות גבוהה ללא אישור רפואי.');
  }
  if (input.flags.kidney) {
    ketoAllowed = false;
    reasons.push('בעיות כליות: ללא תזונה עתירת חלבון/קיטו.');
  }
  if (input.age >= 60) {
    highIntensityAllowed = false;
    reasons.push('גיל 60+: עצימות מתונה מומלצת יותר.');
  }
  if (input.injuries && input.injuries.trim() && input.injuries.trim() !== 'אין') {
    reasons.push(`פציעות/מגבלות מדווחות: ${input.injuries.trim()}.`);
  }

  return { fastingAllowed, ketoAllowed, highIntensityAllowed, reasons };
}
