import { getDb, conversationMemory } from '@eat/db';
import type { ToolDefinition } from './types.js';

export const rememberTool: ToolDefinition = {
  name: 'remember',
  description:
    'שומר עובדה/העדפה/אירוע על המשתמשת לשימוש בשיחות עתידיות. דוגמאות: "שונאת פטריות", "אוהבת מתכוני אסיה", "הולכת לחתונה ב-15.6 ורוצה להיראות מעולה".',
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['fact', 'preference', 'event', 'goal'] },
      content: { type: 'string', description: 'משפט קצר בעברית' },
      expires_in_days: { type: 'number' },
    },
    required: ['kind', 'content'],
  },
  async execute(input: any, ctx) {
    const db = getDb();
    const expiresAt = input.expires_in_days
      ? new Date(Date.now() + input.expires_in_days * 86400_000)
      : null;
    await db.insert(conversationMemory).values({
      userId: ctx.userId,
      kind: input.kind,
      content: input.content,
      expiresAt,
    });
    return { ok: true };
  },
};
