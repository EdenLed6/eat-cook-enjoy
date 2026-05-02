import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getDb, eq, and, gt } from '@eat/db';
import { authSessions, users, authMagicLinks } from '@eat/db';

const SESSION_COOKIE = 'eat_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_TTL_MS = 15 * 60 * 1000;

export async function getCurrentUserId(): Promise<string | null> {
  const ck = await cookies();
  const sid = ck.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(authSessions)
    .where(and(eq(authSessions.id, sid), gt(authSessions.expiresAt, new Date())));
  return row?.userId ?? null;
}

export async function createSession(userId: string): Promise<string> {
  const id = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const db = getDb();
  await db.insert(authSessions).values({ id, userId, expiresAt });
  const ck = await cookies();
  ck.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
  return id;
}

export async function clearSession() {
  const ck = await cookies();
  const sid = ck.get(SESSION_COOKIE)?.value;
  if (sid) {
    const db = getDb();
    await db.delete(authSessions).where(eq(authSessions.id, sid));
  }
  ck.delete(SESSION_COOKIE);
}

export async function createMagicLink(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const db = getDb();
  await db.insert(authMagicLinks).values({ token, email, expiresAt });
  return token;
}

export async function consumeMagicLink(token: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(authMagicLinks)
    .where(and(eq(authMagicLinks.token, token), gt(authMagicLinks.expiresAt, new Date())));
  if (!row || row.usedAt) return null;
  if (row.email.toLowerCase() !== (process.env.DASHBOARD_OWNER_EMAIL ?? '').toLowerCase()) return null;
  await db.update(authMagicLinks).set({ usedAt: new Date() }).where(eq(authMagicLinks.token, token));

  const [user] = await db.select().from(users).limit(1);
  if (!user) return null;
  await db.update(users).set({ email: row.email }).where(eq(users.id, user.id));
  return user.id;
}
