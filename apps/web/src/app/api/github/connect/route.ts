import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { workspace } from '@/lib/workspace';
import { githubConfigured, appUrl } from '@/lib/env';
import { sign } from '@/lib/security';
export async function GET() {
  const { org, user, role } = await workspace();
  if (role === 'member') return new Response('Administrator required', { status: 403 });
  if (!githubConfigured())
    return NextResponse.redirect(appUrl() + '/dashboard/integrations?error=configuration');
  const state = sign(
    { purpose: 'github', organization: org.id, user: user.id, nonce: crypto.randomUUID() },
    600,
  );
  (await cookies()).set('bugsnap_github_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/github',
    maxAge: 600,
  });
  return NextResponse.redirect(
    `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new?state=${encodeURIComponent(state)}`,
  );
}
