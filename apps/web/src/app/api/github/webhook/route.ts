import { NextResponse } from 'next/server';
import { boundedBody, webhookValid } from '@/lib/security';
import { required } from '@/lib/env';
import { adminClient } from '@/lib/supabase/server';
import { refreshRepositories } from '@/lib/github';
export async function POST(request: Request) {
  try {
    const body = (await boundedBody(request, 1024 * 1024)).toString();
    if (
      !webhookValid(
        body,
        request.headers.get('x-hub-signature-256') || '',
        required('GITHUB_WEBHOOK_SECRET'),
      )
    )
      return new Response('Invalid signature', { status: 401 });
    const event = JSON.parse(body);
    const db = adminClient();
    const { data: installation } = await db
      .from('github_installations')
      .select('*')
      .eq('installation_id', event.installation?.id || 0)
      .maybeSingle();
    if (!installation) return NextResponse.json({ received: true });
    const name = request.headers.get('x-github-event');
    if (name === 'installation' && ['deleted', 'suspend'].includes(event.action)) {
      const result = await db
        .from('github_installations')
        .update({ suspended: true })
        .eq('id', installation.id);
      if (result.error) throw result.error;
      await db
        .from('github_repositories')
        .update({ enabled: false })
        .eq('installation_id', installation.id);
    } else if (
      name === 'installation_repositories' ||
      (name === 'installation' && ['unsuspend', 'new_permissions_accepted'].includes(event.action))
    ) {
      await refreshRepositories(installation);
      await db.from('github_installations').update({ suspended: false }).eq('id', installation.id);
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook could not be processed' }, { status: 500 });
  }
}
