import { getDb, weights, sql } from '@eat/db';
import type { ToolDefinition } from './types.js';

export const logWeightTool: ToolDefinition = {
  name: 'log_weight',
  description: 'מתעד מדידת משקל. ביום אחד יש מדידה אחת — אם יש כבר, היא תידרס.',
  input_schema: {
    type: 'object',
    properties: {
      weight_kg: { type: 'number' },
      on_date: {
        type: 'string',
        description: 'YYYY-MM-DD, ברירת מחדל היום',
      },
      note: { type: 'string' },
    },
    required: ['weight_kg'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const onDate = input.on_date ?? new Date().toLocaleDateString('en-CA', { timeZone: ctx.timezone });
    await db
      .insert(weights)
      .values({
        userId: ctx.userId,
        measuredOn: onDate,
        weightKg: String(input.weight_kg),
        note: input.note ?? null,
      })
      .onConflictDoUpdate({
        target: [weights.userId, weights.measuredOn],
        set: {
          weightKg: String(input.weight_kg),
          note: input.note ?? null,
        },
      });
    return { ok: true, on_date: onDate, weight_kg: input.weight_kg };
  },
};
