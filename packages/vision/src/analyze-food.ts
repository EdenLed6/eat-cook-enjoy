import Anthropic from '@anthropic-ai/sdk';
import { mealAnalysisSchema, type MealAnalysis } from '@eat/shared';

const SYSTEM_PROMPT = `אתה אנליסט תזונה מומחה. בהינתן תמונה של אוכל, החזר JSON תקני בלבד עם המבנה הבא:
{
  "items": [
    { "name": "שם המנה/הרכיב בעברית", "grams": <משקל משוער בגרמים או null>, "kcal": <קלוריות>, "protein_g": <חלבון>, "carbs_g": <פחמ׳>, "fat_g": <שומן>, "confidence": <0-1> }
  ],
  "total_kcal": <סה"כ>,
  "total_protein_g": <סה"כ>,
  "total_carbs_g": <סה"כ>,
  "total_fat_g": <סה"כ>,
  "description": "תיאור קצר בעברית של המנה",
  "confidence": <ביטחון כללי 0-1>,
  "notes": "הערות אם רלוונטיות (אופציונלי)"
}

חשוב:
- שמות מנות תמיד בעברית
- אם זו הזמנת Wolt/משלוח עם תפריט נראה - הסתמך על שם המנה הכתוב
- אם לא בטוח במשקל, תן הערכה סבירה לפי גודל הצלחת והיחסים בתמונה
- ערכי קלוריות/מאקרו לפי המשקל המשוער
- החזר רק JSON, ללא טקסט נוסף, ללא code fences`;

export interface AnalyzeFoodInput {
  imageBase64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  caption?: string;
}

export async function analyzeFood(input: AnalyzeFoodInput): Promise<MealAnalysis> {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL_DEFAULT ?? 'claude-sonnet-4-6';

  const userText = input.caption?.trim()
    ? `הקונטקסט מהמשתמשת: "${input.caption.trim()}"\nנתחי את התמונה והחזירי JSON.`
    : 'נתחי את התמונה והחזירי JSON עם פירוט הפריטים והקלוריות.';

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: input.mediaType,
              data: input.imageBase64,
            },
          },
          { type: 'text', text: userText },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Vision API returned no text content');
  }

  const json = extractJson(textBlock.text);
  return mealAnalysisSchema.parse(json);
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`Vision response not JSON: ${raw.slice(0, 200)}`);
  }
  const slice = trimmed.slice(first, last + 1);
  return JSON.parse(slice);
}
