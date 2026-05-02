import { getDb, eq } from '@eat/db';
import { users } from '@eat/db';
import { he } from '@eat/shared';
import type { WASocket } from '@whiskeysockets/baileys';
import { sendText, sendGifFromUrl } from '../baileys/send.js';
import { ownerJid, env } from '../lib/env.js';
import { getTodaySummary, publicR2Url } from '@eat/agent-core';

const SUCCESS_GIFS = Array.from({ length: 5 }, (_, i) => `gifs/success_${i + 1}.gif`);
const MOTIVATE_GIFS = Array.from({ length: 5 }, (_, i) => `gifs/motivate_${i + 1}.gif`);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export async function sendDailySummary(sock: WASocket | null) {
  if (!sock) return;
  const db = getDb();
  const [user] = await db.select().from(users).limit(1);
  if (!user) return;

  const summary = await getTodaySummary(user.id, env.TZ);
  const overshoot = summary.consumed_kcal > summary.target_kcal * 1.05;
  const undershoot = summary.consumed_kcal < summary.target_kcal * 0.7;
  const success = !overshoot && !undershoot && summary.water_ml >= summary.water_target_ml * 0.8;

  const headline = success ? pick(he.summaries.success) : pick(he.summaries.motivate);

  const body = [
    `📊 סיכום ${summary.date}:`,
    `🍽 קלוריות: ${summary.consumed_kcal} / ${summary.target_kcal} (${summary.remaining_kcal >= 0 ? 'נותרו' : 'מעל'} ${Math.abs(summary.remaining_kcal)})`,
    `💧 מים: ${summary.water_ml} / ${summary.water_target_ml} מ"ל`,
    `🚶 צעדים: ${summary.steps} / ${summary.steps_target}`,
    summary.workouts_minutes > 0 ? `🏃 אימונים: ${summary.workouts_minutes} דקות (${summary.workouts_kcal_burned} קק"ל)` : null,
    summary.weight_kg ? `⚖️ משקל: ${summary.weight_kg} ק"ג` : null,
  ]
    .filter(Boolean)
    .join('\n');

  await sendText(sock, user.id, ownerJid(), `${headline}\n\n${body}`);

  try {
    const gifKey = success ? pick(SUCCESS_GIFS) : pick(MOTIVATE_GIFS);
    const url = publicR2Url(gifKey);
    if (url && url.startsWith('http')) {
      await sendGifFromUrl(sock, user.id, ownerJid(), url);
    }
  } catch {
    // ignore — gif is nice-to-have
  }
}
