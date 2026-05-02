import { getAnthropic, defaultModel } from '../claude.js';
import type { ToolDefinition } from './types.js';

export const logWoltOrderTool: ToolDefinition = {
  name: 'log_wolt_order',
  description:
    'בהינתן טקסט הזמנת Wolt או תיאור מנה ממסעדה, מעריך פירוט קלוריות ומחזיר פירוט. אינו שומר במאגר — תקראי ל-log_meal עם התוצאה אחרי אישור.',
  input_schema: {
    type: 'object',
    properties: {
      restaurant: { type: 'string' },
      items_text: { type: 'string', description: 'תיאור הפריטים שהוזמנו' },
    },
    required: ['items_text'],
  },
  async execute(input: any) {
    const client = getAnthropic();
    const prompt = `הזמנת Wolt/מסעדה:
מסעדה: ${input.restaurant ?? 'לא צוין'}
פריטים: ${input.items_text}

החזירי JSON עם:
{
  "items": [{"name":"...","kcal":..., "protein_g":..., "carbs_g":..., "fat_g":...}],
  "total_kcal":..., "total_protein_g":..., "total_carbs_g":..., "total_fat_g":...,
  "description":"...", "confidence":0.6
}
החזירי רק JSON, ללא טקסט נוסף.`;
    const response = await client.messages.create({
      model: defaultModel(),
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return { error: 'no response' };
    const first = block.text.indexOf('{');
    const last = block.text.lastIndexOf('}');
    const parsed = JSON.parse(block.text.slice(first, last + 1));
    return { ok: true, analysis: parsed };
  },
};
