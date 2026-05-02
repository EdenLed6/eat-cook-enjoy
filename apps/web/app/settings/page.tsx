import { redirect } from 'next/navigation';
import { getCurrentUserId, signOut } from '@/lib/auth';
import { Nav } from '@/components/Nav';
import { Card } from '@/components/Card';
import { getDb, eq } from '@eat/db';
import { profiles, users } from '@eat/db';
import { he } from '@eat/shared';

export const dynamic = 'force-dynamic';

async function logout() {
  'use server';
  await signOut();
  redirect('/login');
}

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">הגדרות</h1>

        <Card title="פרופיל">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-gray-500">שם</dt>
            <dd>{user?.displayName ?? '—'}</dd>
            <dt className="text-gray-500">גיל</dt>
            <dd>{profile?.age ?? '—'}</dd>
            <dt className="text-gray-500">גובה</dt>
            <dd>{profile?.heightCm ?? '—'} ס״מ</dd>
            <dt className="text-gray-500">משקל התחלה / יעד</dt>
            <dd>
              {profile?.weightStartKg ?? '—'} → {profile?.weightGoalKg ?? '—'} ק״ג
            </dd>
            <dt className="text-gray-500">שיטה</dt>
            <dd>
              {profile?.dietMethod ? he.dietMethodNames[profile.dietMethod] ?? profile.dietMethod : '—'}
            </dd>
            <dt className="text-gray-500">יעד קלוריות</dt>
            <dd>{profile?.dailyCalorieTarget ?? '—'} קק"ל</dd>
            <dt className="text-gray-500">יעד מים</dt>
            <dd>{profile?.dailyWaterMl ?? '—'} מ"ל</dd>
            <dt className="text-gray-500">יעד צעדים</dt>
            <dd>{profile?.dailyStepsTarget ?? '—'}</dd>
          </dl>
        </Card>

        <Card title="אזור מסוכן">
          <p className="text-sm text-gray-600 mb-3">
            לעדכון פרופיל — שלחי הודעה לבוט בוואצאפ ("עדכוני שאני רוצה לרדת ל-65" וכו׳).
          </p>
          <form action={logout}>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-2 text-sm">
              התנתקות
            </button>
          </form>
        </Card>
      </main>
    </>
  );
}
