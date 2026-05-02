import { NextRequest, NextResponse } from 'next/server';
import { consumeMagicLink, createSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/login?error=missing', req.url));
  const userId = await consumeMagicLink(token);
  if (!userId) return NextResponse.redirect(new URL('/login?error=invalid', req.url));
  await createSession(userId);
  return NextResponse.redirect(new URL('/', req.url));
}
