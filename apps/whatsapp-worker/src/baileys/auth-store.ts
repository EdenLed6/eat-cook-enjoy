import { proto, type AuthenticationState, type SignalDataTypeMap, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import { getDb, baileysAuth, eq, and, inArray } from '@eat/db';

const CREDS_KEY = 'creds';

export async function useDBAuthState(userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const db = getDb();

  async function readKey<T>(key: string): Promise<T | null> {
    const [row] = await db
      .select()
      .from(baileysAuth)
      .where(and(eq(baileysAuth.userId, userId), eq(baileysAuth.key, key)));
    if (!row) return null;
    return JSON.parse(JSON.stringify(row.value), BufferJSON.reviver);
  }

  async function writeKey(key: string, value: unknown): Promise<void> {
    const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
    await db
      .insert(baileysAuth)
      .values({ userId, key, value: serialized })
      .onConflictDoUpdate({
        target: [baileysAuth.userId, baileysAuth.key],
        set: { value: serialized, updatedAt: new Date() },
      });
  }

  async function deleteKey(key: string): Promise<void> {
    await db
      .delete(baileysAuth)
      .where(and(eq(baileysAuth.userId, userId), eq(baileysAuth.key, key)));
  }

  const creds = (await readKey<AuthenticationState['creds']>(CREDS_KEY)) ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const out: { [id: string]: SignalDataTypeMap[T] } = {};
          await Promise.all(
            ids.map(async (id) => {
              const k = `key:${type}:${id}`;
              const value = await readKey<SignalDataTypeMap[T]>(k);
              if (value) {
                if (type === 'app-state-sync-key') {
                  out[id] = proto.Message.AppStateSyncKeyData.fromObject(
                    value as never,
                  ) as unknown as SignalDataTypeMap[T];
                } else {
                  out[id] = value;
                }
              }
            }),
          );
          return out;
        },
        set: async (data) => {
          const ops: Promise<void>[] = [];
          for (const category of Object.keys(data) as Array<keyof SignalDataTypeMap>) {
            const records = data[category];
            if (!records) continue;
            for (const id of Object.keys(records)) {
              const k = `key:${category}:${id}`;
              const value = records[id];
              ops.push(value ? writeKey(k, value) : deleteKey(k));
            }
          }
          await Promise.all(ops);
        },
      },
    },
    saveCreds: async () => {
      await writeKey(CREDS_KEY, creds);
    },
  };
}
