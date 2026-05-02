import makeWASocket, {
  type WASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import { Boom } from '@hapi/boom';
import { logger } from '../lib/logger.js';
import { useDBAuthState } from './auth-store.js';
import { putObject } from '@eat/agent-core';

let _sock: WASocket | null = null;
let _connected = false;
let _lastQrPng: Buffer | null = null;

export function getSock(): WASocket | null {
  return _sock;
}

export function isConnected(): boolean {
  return _connected;
}

export function getLastQrPng(): Buffer | null {
  return _lastQrPng;
}

export interface StartWorkerArgs {
  userId: string;
  onMessage: (sock: WASocket, msg: import('@whiskeysockets/baileys').proto.IWebMessageInfo) => Promise<void>;
}

export async function startBaileys({ userId, onMessage }: StartWorkerArgs): Promise<WASocket> {
  const { state, saveCreds } = await useDBAuthState(userId);
  const { version } = await fetchLatestBaileysVersion();
  logger.info({ version }, 'starting baileys');

  const sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.appropriate('Chrome'),
    printQRInTerminal: false,
    syncFullHistory: false,
    logger: logger.child({ mod: 'baileys' }) as any,
    markOnlineOnConnect: false,
  });

  _sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      logger.info('QR received — generating PNG');
      const png = await qrcode.toBuffer(qr, { type: 'png', width: 512, margin: 2 });
      _lastQrPng = png;
      try {
        await putObject('admin/qr.png', png, 'image/png');
      } catch (err) {
        logger.warn({ err }, 'failed to upload QR to storage (continuing — QR still served from /admin/wa)');
      }
    }
    if (connection === 'open') {
      _connected = true;
      _lastQrPng = null;
      logger.info('whatsapp connected');
    }
    if (connection === 'close') {
      _connected = false;
      const status = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      logger.warn({ status }, 'whatsapp connection closed');
      if (status === DisconnectReason.loggedOut) {
        logger.error('logged out — manual rescan needed');
        return;
      }
      const delay = Math.min(60_000, 1000 * Math.pow(2, getReconnectAttempt()));
      logger.info({ delayMs: delay }, 'reconnecting');
      setTimeout(() => startBaileys({ userId, onMessage }).catch((e) => logger.error({ e }, 'reconnect failed')), delay);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const m of messages) {
      try {
        await onMessage(sock, m);
      } catch (err) {
        logger.error({ err, msgId: m.key.id }, 'onMessage failed');
      }
    }
  });

  return sock;
}

let reconnectAttempt = 0;
function getReconnectAttempt(): number {
  reconnectAttempt = Math.min(reconnectAttempt + 1, 6);
  return reconnectAttempt;
}
export function resetReconnectAttempt(): void {
  reconnectAttempt = 0;
}
