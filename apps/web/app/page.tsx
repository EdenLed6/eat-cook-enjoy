import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { getTodaySummary } from '@eat/agent-core';
import { Nav } from '@/components/Nav';
import { Card, Stat, ProgressBar } from '@/components/Card';
import { getDb, eq, desc, and, gte } from '@eat/db';
import { meals, profiles } from '@eat/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  const summary = await getTodaySummary(userId);
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const recentMeals = await db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, userId), gte(meals.consumedAt, since)))
    .orderBy(desc(meals.consumedAt))
    .limit(5);

  const goal = profile?.weightGoalKg ? Number(profile.weightGoalKg) : null;
  const start = profile?.weightStartKg ? Number(profile.weightStartKg) : null;
  const current = summary.weight_kg;
  const lostKg = start && current ? Number((start - current).toFixed(1)) : 0;
  const totalKg = start && goal ? Number((start - goal).toFixed(1)) : 0;
  const progressPct = totalKg > 0 ? Math.max(0, Math.min(100, (lostKg / totalKg) * 100)) : 0;

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">היום, {summary.date}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="קלוריות">
            <div className="space-y-2">
              <Stat
                label="נצרך"
                value={summary.consumed_kcal}
                unit={`/ ${summary.target_kcal} קק"ל`}
              />
              <ProgressBar value={summary.consumed_kcal} max={summary.target_kcal} />
              <div className="text-sm text-gray-500">
                {summary.remaining_kcal >= 0
                  ? `נותרו ${summary.remaining_kcal} קק"ל`
                  : `מעל היעד ב-${Math.abs(summary.remaining_kcal)} קק"ל`}
              </div>
            </div>
          </Card>

          <Card title="מים 💧">
            <Stat label="היום" value={summary.water_ml} unit={`/ ${summary.water_target_ml} מ"ל`} />
            <div className="mt-3">
              <ProgressBar value={summary.water_ml} max={summary.water_target_ml} color="sky-500" />
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => {
                const filled = (i + 1) * (summary.water_target_ml / 8) <= summary.water_ml;
                return (
                  <div
                    key={i}
                    className={`w-7 h-9 rounded ${filled ? 'bg-sky-400' : 'bg-gray-100'}`}
                    title={`${(i + 1) * 250} מ"ל`}
                  />
                );
              })}
            </div>
          </Card>

          <Card title="צעדים 🚶">
            <Stat label="היום" value={summary.steps} unit={`/ ${summary.steps_target}`} />
            <div className="mt-3">
              <ProgressBar value={summary.steps} max={summary.steps_target} color="emerald-500" />
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {summary.workouts_minutes > 0
                ? `+ ${summary.workouts_minutes} דקות אימון (${summary.workouts_kcal_burned} קק"ל)`
                : 'אין אימון מתועד היום'}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="התקדמות למשקל היעד">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="התחלה" value={start ? `${start}` : '—'} unit="ק״ג" />
              <Stat label="עכשיו" value={current ? `${current}` : '—'} unit="ק״ג" />
              <Stat label="יעד" value={goal ? `${goal}` : '—'} unit="ק״ג" />
            </div>
            <div className="mt-4">
              <ProgressBar value={lostKg} max={totalKg} color="brand-500" />
              <div className="text-sm text-gray-500 mt-2">
                ירדת {lostKg} ק"ג מתוך {totalKg} ({progressPct.toFixed(0)}%)
              </div>
            </div>
          </Card>

          <Card title="ארוחות אחרונות היום">
            {recentMeals.length === 0 ? (
              <div className="text-sm text-gray-500">עוד לא תועדה ארוחה היום.</div>
            ) : (
              <ul className="space-y-2">
                {recentMeals.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{m.description ?? '—'}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(m.consumedAt).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{m.totalKcal} קק"ל</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
