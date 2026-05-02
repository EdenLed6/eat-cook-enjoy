import { getDb, eq, desc, and } from '@eat/db';
import { users, weights, stepsDaily } from '@eat/db';
import { he } from '@eat/shared';
import type { WASocket } from '@whiskeysockets/baileys';
import { sendText } from '../baileys/send.js';
import { ownerJid, env } from '../lib/env.js';

export async function sendMorningCheckin(sock: WASocket | null) {
  if (!sock) return;
  const db = getDb();
  const [user] = await db.select().from(users).limit(1);
  if (!user) return;

  const today = new Date().toLocaleDateString('en-CA', { timeZone: env.TZ });
  const [todayWeight] = await db
    .select()
    .from(weights)
    .where(and(eq(weights.userId, user.id), eq(weights.measuredOn, today)))
    .orderBy(desc(weights.measuredOn))
    .limit(1);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toLocaleDateString('en-CA', { timeZone: env.TZ });
  const [ySteps] = await db
    .select()
    .from(stepsDaily)
    .where(and(eq(stepsDaily.userId, user.id), eq(stepsDaily.onDate, yDate)));

  const needsWeight = !todayWeight;
  const needsSteps = !ySteps;
  if (!needsWeight && !needsSteps) return;

  const parts: string[] = [he.reminders.morning_check_in];
  if (needsWeight && needsSteps) parts.push('משקל מהיום וצעדים מאתמול 🙏');
  else if (needsWeight) parts.push('המשקל מהיום 🙏');
  else if (needsSteps) parts.push('צעדים מאתמול 🙏');

  await sendText(sock, user.id, ownerJid(), parts.join('\n'));
}
