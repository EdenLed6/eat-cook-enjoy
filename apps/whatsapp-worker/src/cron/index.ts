import cron from 'node-cron';
import type { WASocket } from '@whiskeysockets/baileys';
import { logger } from '../lib/logger.js';
import { env } from '../lib/env.js';
import { maybeRemindWater } from './water.js';
import { sendDailySummary } from './daily-summary.js';
import { sendMorningCheckin } from './morning-checkin.js';

export function startCronJobs(getSock: () => WASocket | null) {
  const tz = env.TZ;
  const wrap = (name: string, fn: (sock: WASocket | null) => Promise<void>) => async () => {
    try {
      logger.info({ job: name }, 'cron tick');
      await fn(getSock());
    } catch (err) {
      logger.error({ err, job: name }, 'cron job failed');
    }
  };

  cron.schedule('0 7 * * *', wrap('morning_checkin', sendMorningCheckin), { timezone: tz });
  cron.schedule('0 10,13,16,19 * * *', wrap('water', maybeRemindWater), { timezone: tz });
  cron.schedule('30 21 * * *', wrap('daily_summary', sendDailySummary), { timezone: tz });

  logger.info({ tz }, 'cron jobs registered');
}
