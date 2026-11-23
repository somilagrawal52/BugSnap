import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/server';
import { sign, rateKey } from '@/lib/security';
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = z
      .string()
      .regex(/^bs_[a-f0-9]{32}$/)
      .parse(url.searchParams.get('key'));
    const origin = new URL(url.searchParams.get('origin') || '').origin;
    const header = request.headers.get('origin');
    if (header && header !== origin)
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    const db = adminClient();
    const rate = await db.rpc('consume_rate', {
      p_key: rateKey(request, 'config'),
      p_max: 60,
      p_seconds: 60,
    });
    if (rate.error || !rate.data)
      return NextResponse.json({ error: 'Try again later' }, { status: 429 });
    const { data: project } = await db
      .from('projects')
      .select('id,public_key,enabled,project_domains(origin),widget_settings(*)')
      .eq('public_key', key)
      .single();
    if (
      !project?.enabled ||
      !project.project_domains.some((d: { origin: string }) => d.origin === origin)
    )
      return NextResponse.json({ error: 'Widget unavailable on this domain' }, { status: 403 });
    const settings = Array.isArray(project.widget_settings)
      ? project.widget_settings[0]
      : project.widget_settings;
    return NextResponse.json(
      {
        token: sign({
          purpose: 'submission',
          project: project.id,
          key,
          origin,
          nonce: crypto.randomUUID(),
        }),
        label: settings.label,
        accent: settings.accent,
        position: settings.position,
        appVersion: settings.app_version || undefined,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': origin,
          Vary: 'Origin',
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Widget is not configured' }, { status: 503 });
  }
}
