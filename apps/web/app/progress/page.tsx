import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { Nav } from '@/components/Nav';
import { Card, Stat } from '@/components/Card';
import { WeightChart } from '@/components/charts/WeightChart';
import { CalorieBars } from '@/components/charts/CalorieBars';
import { getDb, eq, and, gte, desc, sql } from '@eat/db';
import { weights, meals, profiles, workouts, stepsDaily } from '@eat/db';
import { estimateStepsKcal } from '@eat/nutrition';

export const dynamic = 'force-dynamic';

type Range = 'week' | 'month' | 'all';

function rangeStartDate(r: Range): string {
  const d = new Date();
  if (r === 'week') d.setDate(d.getDate() - 7);
  else if (r === 'month') d.setDate(d.getDate() - 30);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: Range }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');
  const sp = await searchParams;
  const range: Range = sp.range ?? 'month';
  const sinceDate = rangeStartDate(range);
  const sinceTs = new Date(sinceDate);

  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  const goalKg = profile?.weightGoalKg ? Number(profile.weightGoalKg) : undefined;
  const targetKcal = profile?.dailyCalorieTarget ?? undefined;

  const wRows = await db
    .select()
    .from(weights)
    .where(and(eq(weights.userId, userId), gte(weights.measuredOn, sinceDate)))
    .orderBy(weights.measuredOn);
  const weightsData = withMovingAverage(
    wRows.map((r) => ({ date: r.measuredOn, weight: Number(r.weightKg) })),
    7,
  );

  const mealAgg = await db
    .select({
      date: sql<string>`(${meals.consumedAt} AT TIME ZONE 'Asia/Jerusalem')::date::text`,
      total: sql<number>`coalesce(sum(${meals.totalKcal})::int, 0)`,
    })
    .from(meals)
    .where(and(eq(meals.userId, userId), gte(meals.consumedAt, sinceTs)))
    .groupBy(sql`(${meals.consumedAt} AT TIME ZONE 'Asia/Jerusalem')::date`);

  const workoutAgg = await db
    .select({
      date: sql<string>`(${workouts.startedAt} AT TIME ZONE 'Asia/Jerusalem')::date::text`,
      kcal: sql<number>`coalesce(sum(${workouts.estKcalBurned})::int, 0)`,
    })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.startedAt, sinceTs)))
    .groupBy(sql`(${workouts.startedAt} AT TIME ZONE 'Asia/Jerusalem')::date`);

  const stepRows = await db
    .select()
    .from(stepsDaily)
    .where(and(eq(stepsDaily.userId, userId), gte(stepsDaily.onDate, sinceDate)));

  const latestWeightKg = weightsData.length ? weightsData[weightsData.length - 1]!.weight : Number(profile?.weightStartKg ?? 70);

  const byDate = new Map<string, { consumed: number; burned: number }>();
  for (const m of mealAgg) {
    if (!m.date) continue;
    byDate.set(m.date, { consumed: Number(m.total), burned: byDate.get(m.date)?.burned ?? 0 });
  }
  for (const w of workoutAgg) {
    if (!w.date) continue;
    const existing = byDate.get(w.date) ?? { consumed: 0, burned: 0 };
    byDate.set(w.date, { ...existing, burned: existing.burned + Number(w.kcal) });
  }
  for (const s of stepRows) {
    const kcal = estimateStepsKcal(s.steps, latestWeightKg);
    const existing = byDate.get(s.onDate) ?? { consumed: 0, burned: 0 };
    byDate.set(s.onDate, { ...existing, burned: existing.burned + kcal });
  }
  const calorieData = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, consumed: v.consumed, burned: v.burned }));

  const lostKg = wRows.length >= 2 ? Number(wRows[0]!.weightKg) - Number(wRows[wRows.length - 1]!.weightKg) : 0;

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">התקדמות</h1>
          <div className="flex gap-2 text-sm">
            <RangeBtn r="week" current={range} label="שבוע" />
            <RangeBtn r="month" current={range} label="חודש" />
            <RangeBtn r="all" current={range} label="הכל" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <Stat label="ירידה בטווח" value={lostKg.toFixed(1)} unit="ק״ג" />
          </Card>
          <Card>
            <Stat label="ימים עם תיעוד" value={calorieData.length} unit={`ימים`} />
          </Card>
          <Card>
            <Stat
              label="ממוצע נצרך"
              value={
                calorieData.length
                  ? Math.round(calorieData.reduce((s, d) => s + d.consumed, 0) / calorieData.length)
                  : 0
              }
              unit="קק״ל/יום"
            />
          </Card>
        </div>

        <Card title="גרף משקל">
          <WeightChart data={weightsData} goalKg={goalKg} />
        </Card>

        <Card title="קלוריות נצרך מול נשרף לפי יום">
          <CalorieBars data={calorieData} target={targetKcal} />
        </Card>
      </main>
    </>
  );
}

function RangeBtn({ r, current, label }: { r: Range; current: Range; label: string }) {
  const active = r === current;
  return (
    <a
      href={`/progress?range=${r}`}
      className={`px-3 py-1.5 rounded-lg ${active ? 'bg-brand-500 text-white' : 'bg-white text-gray-700'}`}
    >
      {label}
    </a>
  );
}

function withMovingAverage(rows: { date: string; weight: number }[], window: number) {
  return rows.map((r, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = rows.slice(start, i + 1);
    const ma = slice.reduce((s, x) => s + x.weight, 0) / slice.length;
    return { ...r, ma: Number(ma.toFixed(2)) };
  });
}
