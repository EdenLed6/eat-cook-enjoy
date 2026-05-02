import { getDb, eq, and, gte } from '@eat/db';
import { profiles, users, waterLog } from '@eat/db';
import { he } from '@eat/shared';
import type { WASocket } from '@whiskeysockets/baileys';
import { sendText } from '../baileys/send.js';
import { ownerJid, env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

function startOfDayTzUtc(tz: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = fmt.format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  const local = Date.UTC(y!, m! - 1, d!, 0, 0, 0);
  const sample = new Date(local);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(sample).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const offset =
    Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return new Date(local - offset * 1000);
}

export async function maybeRemindWater(sock: WASocket | null) {
  if (!sock) return;
  const db = getDb();
  const [user] = await db.select().from(users).limit(1);
  if (!user) return;
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
  if (!profile) return;

  const dayStart = startOfDayTzUtc(env.TZ);
  const todayWater = await db
    .select()
    .from(waterLog)
    .where(and(eq(waterLog.userId, user.id), gte(waterLog.loggedAt, dayStart)));
  const consumed = todayWater.reduce((s, w) => s + w.amountMl, 0);
  const target = profile.dailyWaterMl ?? 2500;

  const now = new Date();
  const localHour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: env.TZ, hour: '2-digit', hour12: false }).format(now),
  );

  // expected progress at this hour: assume 12h drinking window 8-20
  const fraction = Math.max(0, Math.min(1, (localHour - 8) / 12));
  const expected = target * fraction;
  if (consumed >= expected * 0.9) {
    logger.info({ consumed, expected }, 'water on track — skipping reminder');
    return;
  }

  const remaining = Math.max(0, target - consumed);
  const text = chooseWaterMessage(localHour, remaining);
  await sendText(sock, user.id, ownerJid(), text);
}

function chooseWaterMessage(hour: number, remainingMl: number): string {
  if (hour < 11) return he.reminders.water_morning;
  if (hour < 14) return he.reminders.water_midday;
  if (hour < 18) return he.reminders.water_afternoon.replace('{remaining}', String(remainingMl));
  return he.reminders.water_evening;
}
