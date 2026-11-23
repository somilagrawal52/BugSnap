import { NextResponse } from 'next/server';
import { sessionClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get('code');
  if (code) {
    const db = await sessionClient();
    const result = await db.auth.exchangeCodeForSession(code);
    if (!result.error) {
      const next = url.searchParams.get('next');
      return NextResponse.redirect(appUrl() + (next === '/reset-password' ? next : '/dashboard'));
    }
  }
  return NextResponse.redirect(appUrl() + '/login?error=verification');
}
