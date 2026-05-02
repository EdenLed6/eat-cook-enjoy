import { getDb, profiles, eq } from '@eat/db';
import { getAnthropic, defaultModel } from '../claude.js';
import { getTodaySummary } from '../memory.js';
import type { ToolDefinition } from './types.js';

async function tavilySearch(query: string, max = 5) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'basic',
      max_results: max,
      include_answer: false,
    }),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: Array<{ title: string; url: string; content: string }> };
  return data.results ?? [];
}

export const searchRecipesTool: ToolDefinition = {
  name: 'search_recipes',
  description:
    'מחפש מתכונים בריאים באינטרנט (Tavily). השתמשי כשהמשתמשת מבקשת רעיון מתכון או מבקשת מתכון ספציפי.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      cuisine: { type: 'string' },
      max_kcal_per_serving: { type: 'number' },
    },
    required: ['query'],
  },
  async execute(input: any) {
    const q = `מתכון ${input.query} בריא ${input.cuisine ?? ''} ${input.max_kcal_per_serving ? 'מתחת ל-' + input.max_kcal_per_serving + ' קלוריות' : ''}`;
    const results = await tavilySearch(q, 5);
    return {
      ok: true,
      results: results.map((r) => ({ title: r.title, url: r.url, snippet: r.content.slice(0, 200) })),
    };
  },
};

export const suggestMealTool: ToolDefinition = {
  name: 'suggest_meal',
  description:
    'מציע 3 רעיונות לארוחה מותאמים אישית: מתחשב באלרגיות, דברים שלא אוהבת, יעד הקלוריות שנותר היום, ובשיטה הנבחרת.',
  input_schema: {
    type: 'object',
    properties: {
      meal_slot: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      max_kcal: { type: 'number', description: 'מקסימום קלוריות לאופציה (אם לא צוין, נחשב מהיתרה)' },
      extra_constraints: { type: 'string' },
    },
    required: ['meal_slot'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.userId));
    const today = await getTodaySummary(ctx.userId, ctx.timezone);
    const remaining = today.remaining_kcal;
    const cap = input.max_kcal ?? Math.max(150, Math.min(700, Math.round(remaining * 0.6)));

    const allergies = (profile?.allergies ?? []).join(', ') || 'אין';
    const dislikes = (profile?.dislikes ?? []).join(', ') || 'אין';
    const cuisines = (profile?.cuisinePrefs ?? []).join(', ') || 'אין העדפה';
    const kosher = profile?.kosher ? 'כן' : 'לא';
    const dietMethod = profile?.dietMethod ?? 'mediterranean';

    const prompt = `הציעי 3 רעיונות לארוחה בעברית. החזירי JSON בלבד.

קונטקסט:
- ארוחה: ${input.meal_slot}
- שיטה תזונתית: ${dietMethod}
- מקסימום קלוריות לאופציה: ${cap}
- אלרגיות: ${allergies}
- לא אוהבת: ${dislikes}
- מטבח מועדף: ${cuisines}
- כשרות: ${kosher}
- יעד שנותר היום: ${remaining} קק"ל
- מגבלות נוספות: ${input.extra_constraints ?? 'אין'}

החזירי:
{
  "options": [
    { "name":"...", "kcal":..., "protein_g":..., "prep_time_min":..., "ingredients_short":"...", "why_good":"משפט קצר למה זה מתאים" }
  ]
}`;
    const client = getAnthropic();
    const response = await client.messages.create({
      model: defaultModel(),
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return { error: 'no response' };
    const first = block.text.indexOf('{');
    const last = block.text.lastIndexOf('}');
    const parsed = JSON.parse(block.text.slice(first, last + 1));
    return { ok: true, suggestions: parsed };
  },
};
