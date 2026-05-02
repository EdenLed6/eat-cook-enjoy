import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb, eq } from '@eat/db';
import { stepsDaily, users } from '@eat/db';

export async function POST(req: NextRequest) {
  const secret = process.env.STEPS_HMAC_SECRET;
  if (!secret) return NextResponse.json({ error: 'not configured' }, { status: 500 });

  const sig = req.headers.get('x-signature');
  if (!sig) return NextResponse.json({ error: 'missing signature' }, { status: 401 });

  const body = await req.text();
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (!timingSafeEqual(sig, expected)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const data = JSON.parse(body) as { on_date: string; steps: number; phone_e164?: string };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.on_date) || typeof data.steps !== 'number') {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }

  const db = getDb();
  const [user] = await db.select().from(users).limit(1);
  if (!user) return NextResponse.json({ error: 'no user' }, { status: 404 });

  await db
    .insert(stepsDaily)
    .values({
      userId: user.id,
      onDate: data.on_date,
      steps: Math.round(data.steps),
      source: 'health_connect',
    })
    .onConflictDoUpdate({
      target: [stepsDaily.userId, stepsDaily.onDate],
      set: { steps: Math.round(data.steps), source: 'health_connect' },
    });

  return NextResponse.json({ ok: true });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
