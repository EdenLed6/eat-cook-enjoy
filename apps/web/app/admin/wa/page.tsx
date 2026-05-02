import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { Nav } from '@/components/Nav';
import { Card } from '@/components/Card';
import { publicR2Url } from '@eat/agent-core';
import { getDb, eq, desc } from '@eat/db';
import { messages } from '@eat/db';

export const dynamic = 'force-dynamic';

async function fetchWorkerHealth(): Promise<{ ok: boolean; baileys: boolean } | null> {
  try {
    const url = process.env.WORKER_HEALTH_URL ?? 'http://worker.internal:8080/health';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as { ok: boolean; baileys: boolean };
  } catch {
    return null;
  }
}

export default async function WaAdminPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  const health = await fetchWorkerHealth();
  const qrUrl = publicR2Url('admin/qr.png');
  const db = getDb();
  const recent = await db
    .select()
    .from(messages)
    .where(eq(messages.userId, userId))
    .orderBy(desc(messages.createdAt))
    .limit(20);

  return (
    <>
      <Nav />
      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">ניהול וואצאפ</h1>
        <Card title="סטטוס Baileys">
          {!health ? (
            <div className="text-amber-600">לא הצלחתי להגיע ל-worker</div>
          ) : health.baileys ? (
            <div className="text-green-700 font-medium">מחובר ✅</div>
          ) : (
            <div>
              <div className="text-amber-600 font-medium mb-3">לא מחובר. סרקי את ה-QR להתחברות:</div>
              {qrUrl.startsWith('http') ? (
                <img src={qrUrl} alt="QR" className="w-72 h-72 rounded-xl border" />
              ) : (
                <div className="text-sm text-gray-500">QR יופיע ב-R2 כש-Baileys ייצור אחד</div>
              )}
            </div>
          )}
        </Card>
        <Card title="20 ההודעות האחרונות">
          <ul className="divide-y divide-gray-50 text-sm">
            {recent.map((m) => (
              <li key={m.id} className="py-2 flex gap-3">
                <span className={m.direction === 'in' ? 'text-blue-600' : 'text-emerald-600'}>
                  {m.direction === 'in' ? '↘' : '↗'}
                </span>
                <span className="flex-1 truncate">{m.text ?? `[${m.contentType}]`}</span>
                <span className="text-xs text-gray-400">
                  {new Date(m.createdAt).toLocaleTimeString('he-IL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </>
  );
}
