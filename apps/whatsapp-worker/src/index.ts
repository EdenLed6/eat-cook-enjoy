import http from 'node:http';
import { logger } from './lib/logger.js';
import { env } from './lib/env.js';
import { startBaileys, getSock, isConnected, getLastQrPng } from './baileys/client.js';
import { onMessage } from './handlers/message.js';
import { startCronJobs } from './cron/index.js';
import { getDb, users, eq } from '@eat/db';

async function ensureOwnerUser() {
  const db = getDb();
  const phone = env.OWNER_PHONE_E164;
  const [existing] = await db.select().from(users).where(eq(users.phoneE164, phone));
  if (existing) return existing.id;
  const [created] = await db.insert(users).values({ phoneE164: phone }).returning({ id: users.id });
  logger.info({ userId: created!.id }, 'created owner user');
  return created!.id;
}

function startHealthServer() {
  const port = Number(process.env.WORKER_HEALTH_PORT ?? 8080);
  http
    .createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, baileys: isConnected() }));
        return;
      }
      if (req.url === '/qr') {
        const png = getLastQrPng();
        if (png) {
          res.writeHead(200, { 'Content-Type': 'image/png' });
          res.end(png);
          return;
        }
        res.writeHead(404).end('no qr');
        return;
      }
      res.writeHead(404).end();
    })
    .listen(port, () => logger.info({ port }, 'worker health server up'));
}

async function main() {
  logger.info('worker starting');
  await ensureOwnerUser();
  startHealthServer();
  const userId = await ensureOwnerUser();
  await startBaileys({ userId, onMessage });
  startCronJobs(() => getSock());
  logger.info('worker ready');
}

main().catch((err) => {
  logger.error({ err }, 'worker fatal');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM — shutting down');
  process.exit(0);
});
