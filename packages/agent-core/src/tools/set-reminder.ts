import { getDb, reminders } from '@eat/db';
import type { ToolDefinition } from './types.js';

export const setReminderTool: ToolDefinition = {
  name: 'set_reminder',
  description: 'מוסיף או מעדכן תזכורת חוזרת. cron בפורמט תקני, אזור זמן Asia/Jerusalem.',
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['water', 'walk', 'meal_log', 'weight'] },
      cron: { type: 'string' },
      enabled: { type: 'boolean' },
    },
    required: ['kind', 'cron'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    await db.insert(reminders).values({
      userId: ctx.userId,
      kind: input.kind,
      cron: input.cron,
      enabled: input.enabled ?? true,
    });
    return { ok: true };
  },
};
