import { getDb, waterLog } from '@eat/db';
import type { ToolDefinition } from './types.js';

export const logWaterTool: ToolDefinition = {
  name: 'log_water',
  description: 'מתעד שתיית מים בכמות נתונה במ"ל.',
  input_schema: {
    type: 'object',
    properties: {
      amount_ml: { type: 'number' },
      logged_at_iso: { type: 'string' },
    },
    required: ['amount_ml'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const at = input.logged_at_iso ? new Date(input.logged_at_iso) : new Date();
    await db.insert(waterLog).values({
      userId: ctx.userId,
      loggedAt: at,
      amountMl: Math.round(input.amount_ml),
    });
    return { ok: true, amount_ml: Math.round(input.amount_ml) };
  },
};
