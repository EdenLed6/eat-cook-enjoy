import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function getSupabase() {
  const cookieStore = await cookies();
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — Next.js disallows mutation, ignore.
        }
      },
    },
  });
}
