import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { Nav } from '@/components/Nav';
import { Card } from '@/components/Card';
import { getDb, eq, desc } from '@eat/db';
import { meals } from '@eat/db';

export const dynamic = 'force-dynamic';

export default async function MealsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');
  const db = getDb();
  const rows = await db
    .select()
    .from(meals)
    .where(eq(meals.userId, userId))
    .orderBy(desc(meals.consumedAt))
    .limit(100);

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">ארוחות</h1>
        <Card>
          <table className="w-full text-sm">
            <thead className="text-right text-gray-500 border-b border-gray-100">
              <tr>
                <th className="py-2">זמן</th>
                <th>תיאור</th>
                <th>מקור</th>
                <th>קק"ל</th>
                <th>חלבון</th>
                <th>פחמ׳</th>
                <th>שומן</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2">
                    {new Date(m.consumedAt).toLocaleString('he-IL', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{m.description}</td>
                  <td className="text-gray-500">{m.source}</td>
                  <td className="font-semibold">{m.totalKcal}</td>
                  <td>{m.proteinG ?? '—'}</td>
                  <td>{m.carbsG ?? '—'}</td>
                  <td>{m.fatG ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    אין עדיין ארוחות מתועדות
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
