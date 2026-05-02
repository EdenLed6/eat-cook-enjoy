import type { WASocket, proto } from '@whiskeysockets/baileys';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { getDb, eq, messages as messagesTable, users } from '@eat/db';
import { runAgent, putObject } from '@eat/agent-core';
import { logger } from '../lib/logger.js';
import { env, ownerJid } from '../lib/env.js';
import { sendText } from '../baileys/send.js';
import {
  isOnboardingActive,
  startOnboarding,
  handleOnboardingMessage,
} from './onboarding.js';

async function ensureUser(): Promise<string> {
  const db = getDb();
  const phone = env.OWNER_PHONE_E164;
  const [existing] = await db.select().from(users).where(eq(users.phoneE164, phone));
  if (existing) return existing.id;
  const [created] = await db
    .insert(users)
    .values({ phoneE164: phone })
    .returning({ id: users.id });
  return created!.id;
}

function extractText(m: proto.IWebMessageInfo): string | null {
  const msg = m.message;
  if (!msg) return null;
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  return null;
}

function hasImage(m: proto.IWebMessageInfo): boolean {
  return !!m.message?.imageMessage;
}

export async function onMessage(
  sock: WASocket,
  m: proto.IWebMessageInfo,
): Promise<void> {
  if (m.key.fromMe) return;
  if (!m.message) return;
  if (m.key.remoteJid !== ownerJid()) {
    logger.debug({ jid: m.key.remoteJid }, 'dropping message from non-owner');
    return;
  }

  const userId = await ensureUser();
  const db = getDb();
  const text = extractText(m);

  if (hasImage(m)) {
    const buffer = (await downloadMediaMessage(m, 'buffer', {})) as Buffer;
    const storageKey = `meals/${userId}/${m.key.id ?? Date.now()}.jpg`;
    await putObject(storageKey, buffer, 'image/jpeg');
    await db.insert(messagesTable).values({
      userId,
      direction: 'in',
      channel: 'whatsapp',
      waMessageId: m.key.id ?? null,
      contentType: 'image',
      text: text ?? null,
      mediaStorageKey: storageKey,
    });

    if (await isOnboardingActive(userId)) {
      await sendText(sock, userId, ownerJid(), 'נסיים קודם את האונבורדינג ואז אעבור לעבד תמונות 🙂');
      return;
    }

    const result = await runAgent({
      userId,
      timezone: env.TZ,
      incoming: { kind: 'image', storageKey, caption: text ?? undefined },
    });
    await sendText(sock, userId, ownerJid(), result.text);
    return;
  }

  if (!text) return;

  await db.insert(messagesTable).values({
    userId,
    direction: 'in',
    channel: 'whatsapp',
    waMessageId: m.key.id ?? null,
    contentType: 'text',
    text,
  });

  if (await isOnboardingActive(userId)) {
    await handleOnboardingMessage(sock, userId, ownerJid(), text);
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.displayName) {
    await startOnboarding(sock, userId, ownerJid());
    return;
  }

  const result = await runAgent({
    userId,
    timezone: env.TZ,
    incoming: { kind: 'text', text },
  });
  await sendText(sock, userId, ownerJid(), result.text);
}
