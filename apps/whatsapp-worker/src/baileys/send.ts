import type { WASocket } from '@whiskeysockets/baileys';
import { logger } from '../lib/logger.js';
import { getDb, messages } from '@eat/db';

async function persistOutbound(userId: string, jid: string, text: string, contentType = 'text', mediaStorageKey?: string) {
  try {
    const db = getDb();
    await db.insert(messages).values({
      userId,
      direction: 'out',
      channel: 'whatsapp',
      contentType,
      text,
      mediaStorageKey: mediaStorageKey ?? null,
    });
  } catch (err) {
    logger.warn({ err }, 'failed to persist outbound');
  }
}

export async function sendText(sock: WASocket, userId: string, jid: string, text: string) {
  try {
    await sock.sendPresenceUpdate('composing', jid);
  } catch {
    // ignore
  }
  await sock.sendMessage(jid, { text });
  await persistOutbound(userId, jid, text);
}

export async function sendImage(
  sock: WASocket,
  userId: string,
  jid: string,
  buffer: Buffer,
  caption?: string,
) {
  try {
    await sock.sendPresenceUpdate('composing', jid);
  } catch {
    // ignore
  }
  await sock.sendMessage(jid, { image: buffer, caption });
  await persistOutbound(userId, jid, caption ?? '[image]', 'image');
}

export async function sendGifFromUrl(
  sock: WASocket,
  userId: string,
  jid: string,
  url: string,
  caption?: string,
) {
  await sock.sendMessage(jid, {
    video: { url },
    gifPlayback: true,
    caption,
  });
  await persistOutbound(userId, jid, caption ?? '[gif]', 'image', url);
}
