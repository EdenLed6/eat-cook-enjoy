import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { Nav } from '@/components/Nav';
import { Card } from '@/components/Card';
import { getDb, eq, desc, and, gte } from '@eat/db';
import { workouts, stepsDaily } from '@eat/db';

export const dynamic = 'force-dynamic';

export default async function WorkoutsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceDate = since.toISOString().slice(0, 10);

  const recent = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.startedAt))
    .limit(50);

  const stepRows = await db
    .select()
    .from(stepsDaily)
    .where(and(eq(stepsDaily.userId, userId), gte(stepsDaily.onDate, sinceDate)))
    .orderBy(desc(stepsDaily.onDate));

  const totalMinutes = recent.reduce((s, w) => s + w.durationMin, 0);
  const totalKcal = recent.reduce((s, w) => s + (w.estKcalBurned ?? 0), 0);

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">אימונים</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-xs text-gray-500">סה"כ אימונים בחודש</div>
            <div className="text-3xl font-bold">{recent.length}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">דקות אימון</div>
            <div className="text-3xl font-bold">{totalMinutes}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">קק"ל שנשרפו</div>
            <div className="text-3xl font-bold">{totalKcal}</div>
          </Card>
        </div>

        <Card title="אימונים אחרונים">
          {recent.length === 0 ? (
            <div className="text-sm text-gray-500">אין עדיין אימונים מתועדים</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recent.map((w) => (
                <li key={w.id} className="py-3 flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{w.type}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(w.startedAt).toLocaleDateString('he-IL')} · {w.intensity ?? '—'}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{w.durationMin} דק'</div>
                    <div className="text-xs text-gray-500">{w.estKcalBurned ?? 0} קק"ל</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="צעדים לפי יום (30 יום אחרונים)">
          {stepRows.length === 0 ? (
            <div className="text-sm text-gray-500">אין נתוני צעדים</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {stepRows.slice(0, 30).map((s) => (
                <div key={s.onDate} className="text-center">
                  <div
                    className="rounded mx-auto"
                    style={{
                      width: 24,
                      height: Math.min(80, 8 + s.steps / 200),
                      background: '#e8826b',
                      opacity: Math.min(1, 0.3 + s.steps / 12000),
                    }}
                  />
                  <div className="text-[10px] text-gray-500 mt-1">{s.onDate.slice(5)}</div>
                  <div className="text-[10px] font-semibold">{s.steps}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
