import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

let _db: ReturnType<typeof createDb> | null = null;

function createDb(url: string) {
  const client = postgres(url, {
    max: 5,
    prepare: false,
    idle_timeout: 30,
  });
  return drizzle(client, { schema });
}

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _db = createDb(url);
  }
  return _db;
}

export type Db = ReturnType<typeof getDb>;
