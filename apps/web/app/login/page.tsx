import { Resend } from 'resend';
import { redirect } from 'next/navigation';
import { createMagicLink } from '@/lib/auth';

async function sendMagicLink(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const allowed = (process.env.DASHBOARD_OWNER_EMAIL ?? '').toLowerCase();
  if (!email || email !== allowed) {
    redirect('/login?error=unauthorized');
  }
  const token = await createMagicLink(email);
  const link = `${process.env.APP_URL ?? ''}/login/verify?token=${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'login@example.com',
      to: email,
      subject: 'קישור התחברות לדאשבורד',
      html: `<p>היי 👋</p><p>זה הקישור להתחברות:</p><p><a href="${link}">${link}</a></p><p>בתוקף ל-15 דקות.</p>`,
    });
  } else {
    console.log('LOGIN LINK (no Resend configured):', link);
  }
  redirect('/login?sent=1');
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form action={sendMagicLink} className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">התחברות</h1>
        <p className="text-sm text-gray-500">קבלי קישור התחברות במייל</p>
        <input
          type="email"
          name="email"
          required
          placeholder="האימייל שלך"
          className="w-full border border-gray-300 rounded-xl p-3 focus:outline-brand-500 focus:border-brand-500"
        />
        <button className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl p-3">
          שלחי קישור
        </button>
        <SearchParamsHint searchParams={searchParams} />
      </form>
    </main>
  );
}

async function SearchParamsHint({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const sp = await searchParams;
  if (sp.sent) return <p className="text-green-700 text-sm">שלחנו לך קישור — בדקי את המייל</p>;
  if (sp.error === 'unauthorized') return <p className="text-red-600 text-sm">מייל לא מורשה</p>;
  return null;
}
