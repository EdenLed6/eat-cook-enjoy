import { getDb, meals } from '@eat/db';
import type { ToolDefinition } from './types.js';

export const logMealTool: ToolDefinition = {
  name: 'log_meal',
  description:
    'מתעד ארוחה במאגר. השתמשי בכלי הזה אחרי שניתחת את האוכל (משאלה טקסטואלית או אחרי log_meal_from_photo). הזמן ברירת מחדל הוא עכשיו אם לא צוין אחרת.',
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'תיאור קצר של הארוחה בעברית' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            grams: { type: 'number' },
            kcal: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fat_g: { type: 'number' },
          },
          required: ['name', 'kcal'],
        },
      },
      total_kcal: { type: 'number' },
      total_protein_g: { type: 'number' },
      total_carbs_g: { type: 'number' },
      total_fat_g: { type: 'number' },
      source: {
        type: 'string',
        enum: ['text', 'photo', 'wolt', 'suggested'],
      },
      consumed_at_iso: {
        type: 'string',
        description: 'ISO 8601, אופציונלי. ברירת מחדל: עכשיו.',
      },
      photo_storage_key: { type: 'string', description: 'מפתח התמונה באחסון אם זה מתוך log_meal_from_photo' },
      vision_confidence: { type: 'number' },
    },
    required: ['description', 'items', 'total_kcal', 'source'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const consumedAt = input.consumed_at_iso ? new Date(input.consumed_at_iso) : new Date();
    const [row] = await db
      .insert(meals)
      .values({
        userId: ctx.userId,
        consumedAt,
        source: input.source,
        description: input.description,
        items: input.items,
        totalKcal: Math.round(input.total_kcal),
        proteinG: input.total_protein_g != null ? String(input.total_protein_g) : null,
        carbsG: input.total_carbs_g != null ? String(input.total_carbs_g) : null,
        fatG: input.total_fat_g != null ? String(input.total_fat_g) : null,
        photoStorageKey: input.photo_storage_key ?? ctx.pendingPhotoStorageKey ?? null,
        visionConfidence:
          input.vision_confidence != null ? String(input.vision_confidence) : null,
      })
      .returning({ id: meals.id });
    return { ok: true, meal_id: row?.id };
  },
};

export const logMealFromPhotoTool: ToolDefinition = {
  name: 'log_meal_from_photo',
  description:
    'מנתח את התמונה האחרונה שהמשתמשת שלחה ומחזיר פירוט פריטים וקלוריות. אינו שומר במאגר — אחרי שמראים למשתמשת ומאשרת, נא לקרוא ל-log_meal עם התוצאה.',
  input_schema: {
    type: 'object',
    properties: {
      caption: { type: 'string', description: 'הקפשן/התיאור שצורף לתמונה (אם יש)' },
    },
  },
  async execute(input: any, ctx) {
    if (!ctx.pendingPhotoStorageKey) {
      return { error: 'אין תמונה ממתינה לניתוח. תבקשי מהמשתמשת לשלוח שוב את התמונה.' };
    }
    const { fetchObjectToBase64 } = await import('../storage.js');
    const { analyzeFood } = await import('@eat/vision');
    const { base64, mediaType } = await fetchObjectToBase64(ctx.pendingPhotoStorageKey);
    const analysis = await analyzeFood({
      imageBase64: base64,
      mediaType,
      caption: input.caption,
    });
    return {
      ok: true,
      photo_storage_key: ctx.pendingPhotoStorageKey,
      analysis,
    };
  },
};
