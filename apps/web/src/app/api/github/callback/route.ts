import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Octokit } from '@octokit/rest';
import { workspace } from '@/lib/workspace';
import { adminClient } from '@/lib/supabase/server';
import { appUrl, required } from '@/lib/env';
import { verify } from '@/lib/security';
import { refreshRepositories } from '@/lib/github';
export async function GET(request: Request) {
  try {
    const { org, user, role } = await workspace();
    if (role === 'member') throw new Error('Forbidden');
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || '';
    const jar = await cookies();
    if (state !== jar.get('bugsnap_github_state')?.value) throw new Error('State mismatch');
    const payload = verify<{ purpose: string; organization: string; user: string }>(state);
    if (payload.purpose !== 'github' || payload.organization !== org.id || payload.user !== user.id)
      throw new Error('State mismatch');
    const code = url.searchParams.get('code');
    const installationId = Number(url.searchParams.get('installation_id'));
    if (!code || !Number.isSafeInteger(installationId) || installationId <= 0)
      throw new Error('Missing installation authorization');
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: required('GITHUB_CLIENT_ID'),
        client_secret: required('GITHUB_CLIENT_SECRET'),
        code,
        redirect_uri: appUrl() + '/api/github/callback',
      }),
      signal: AbortSignal.timeout(15000),
    });
    const access = await response.json();
    if (!access.access_token) throw new Error('Authorization failed');
    const github = new Octokit({ auth: access.access_token });
    const installations = await github.paginate(github.apps.listInstallationsForAuthenticatedUser, {
      per_page: 100,
    });
    const installation = installations.find((i) => i.id === installationId);
    if (!installation) throw new Error('Installation not authorized for this user');
    const db = adminClient();
    const existing = await db
      .from('github_installations')
      .select('*')
      .eq('installation_id', installationId)
      .maybeSingle();
    if (existing.data && existing.data.organization_id !== org.id)
      throw new Error('Installation belongs to another workspace');
    const account = installation.account;
    const result = await db
      .from('github_installations')
      .upsert(
        {
          organization_id: org.id,
          installation_id: installationId,
          account_login: account && 'login' in account ? account.login : account?.name || 'GitHub',
          suspended: false,
        },
        { onConflict: 'installation_id' },
      )
      .select('*')
      .single();
    if (result.error) throw result.error;
    await refreshRepositories(result.data);
    jar.delete('bugsnap_github_state');
    return NextResponse.redirect(appUrl() + '/dashboard/integrations?connected=1');
  } catch {
    return NextResponse.redirect(appUrl() + '/dashboard/integrations?error=authorization');
  }
}
