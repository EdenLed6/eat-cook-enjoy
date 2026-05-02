import { getDb } from '@eat/db';
import { users } from '@eat/db';
import { getSupabase } from './supabase';

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const owner = (process.env.DASHBOARD_OWNER_EMAIL ?? '').toLowerCase();
  if (user.email.toLowerCase() !== owner) return null;

  const db = getDb();
  const [appUser] = await db.select().from(users).limit(1);
  if (!appUser) return null;

  if (appUser.email !== user.email) {
    await db.update(users).set({ email: user.email }).where(eqId(appUser.id));
  }
  return appUser.id;
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
}

import { eq } from '@eat/db';
function eqId(id: string) {
  return eq(users.id, id);
}
