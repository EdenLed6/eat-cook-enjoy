import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

const bucket = () => process.env.SUPABASE_STORAGE_BUCKET ?? 'eat-cook-enjoy';

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const { error } = await getClient()
    .storage.from(bucket())
    .upload(key, body, { contentType, upsert: true });
  if (error) throw error;
  return key;
}

export async function fetchObjectToBase64(
  key: string,
): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }> {
  const { data, error } = await getClient().storage.from(bucket()).download(key);
  if (error || !data) throw error ?? new Error('object not found');
  const buf = Buffer.from(await data.arrayBuffer());
  const ct = data.type || 'image/jpeg';
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg';
  if (ct.includes('png')) mediaType = 'image/png';
  else if (ct.includes('webp')) mediaType = 'image/webp';
  else if (ct.includes('gif')) mediaType = 'image/gif';
  return { base64: buf.toString('base64'), mediaType };
}

export function publicObjectUrl(key: string): string {
  const { data } = getClient().storage.from(bucket()).getPublicUrl(key);
  return data.publicUrl;
}
