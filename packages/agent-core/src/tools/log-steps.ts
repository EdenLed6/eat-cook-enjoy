import { getDb, stepsDaily } from '@eat/db';
import type { ToolDefinition } from './types.js';

export const logStepsTool: ToolDefinition = {
  name: 'log_steps_manual',
  description: 'מתעד מספר צעדים יומי כפי שדווח ידנית על ידי המשתמשת.',
  input_schema: {
    type: 'object',
    properties: {
      steps: { type: 'number' },
      on_date: { type: 'string', description: 'YYYY-MM-DD, ברירת מחדל היום' },
    },
    required: ['steps'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const onDate = input.on_date ?? new Date().toLocaleDateString('en-CA', { timeZone: ctx.timezone });
    await db
      .insert(stepsDaily)
      .values({
        userId: ctx.userId,
        onDate,
        steps: Math.round(input.steps),
        source: 'manual',
      })
      .onConflictDoUpdate({
        target: [stepsDaily.userId, stepsDaily.onDate],
        set: { steps: Math.round(input.steps), source: 'manual' },
      });
    return { ok: true, on_date: onDate, steps: Math.round(input.steps) };
  },
};
