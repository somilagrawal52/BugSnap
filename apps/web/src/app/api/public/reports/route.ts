import { NextResponse } from 'next/server';
import { z } from 'zod';
import { reportSchema } from '@bugsnap/shared';
import { adminClient } from '@/lib/supabase/server';
import { boundedBody, verify, hash, rateKey, sameOrigin } from '@/lib/security';
import { sanitizeImage } from '@/lib/images';
export async function POST(request: Request) {
  let uploaded: string | undefined;
  let committed = false;
  try {
    if (!sameOrigin(request))
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    const key = z.uuid().parse(request.headers.get('idempotency-key'));
    const token = verify<{
      purpose: string;
      project: string;
      key: string;
      origin: string;
      nonce: string;
    }>((request.headers.get('authorization') || '').replace(/^Bearer /, ''));
    if (token.purpose !== 'submission') throw new Error('Invalid token');
    const db = adminClient();
    const { data: project } = await db
      .from('projects')
      .select(
        'id,organization_id,public_key,enabled,project_domains(origin),widget_settings(app_version)',
      )
      .eq('id', token.project)
      .single();
    if (
      !project?.enabled ||
      project.public_key !== token.key ||
      !project.project_domains.some((d: { origin: string }) => d.origin === token.origin)
    )
      return NextResponse.json({ error: 'Project unavailable' }, { status: 403 });
    for (const [scope, max, seconds] of [
      [`submit:${project.id}`, 15, 600],
      [`project:${project.id}`, 120, 60],
    ] as const) {
      const rate = await db.rpc('consume_rate', {
        p_key: scope.startsWith('project:') ? hash(scope) : rateKey(request, scope),
        p_max: max,
        p_seconds: seconds,
      });
      if (rate.error || !rate.data)
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': '60' } },
        );
    }
    const bytes = await boundedBody(request, 6 * 1024 * 1024);
    const form = await new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
      body: new Uint8Array(bytes),
    }).formData();
    const input = reportSchema.parse(JSON.parse(String(form.get('report'))));
    if (input.context.origin !== token.origin) throw new Error('Invalid context');
    const settings = Array.isArray(project.widget_settings)
      ? project.widget_settings[0]
      : project.widget_settings;
    input.context.appVersion = settings?.app_version || undefined;
    const screenshot = form.get('screenshot');
    const fileBytes =
      screenshot instanceof File && screenshot.size
        ? Buffer.from(await screenshot.arrayBuffer())
        : undefined;
    const { turnstileToken: challenge, website: _website, ...data } = input;
    const payloadHash = hash(
      JSON.stringify({ ...data, context: { ...data.context, timestamp: undefined } }) +
        (fileBytes ? hash(fileBytes) : ''),
    );
    const existing = await db
      .from('reports')
      .select('reference,payload_hash')
      .eq('project_id', project.id)
      .eq('idempotency_key', key)
      .maybeSingle();
    if (existing.data) {
      if (existing.data.payload_hash !== payloadHash)
        return NextResponse.json(
          { error: 'Retry key already used for different content' },
          { status: 409 },
        );
      return NextResponse.json({ reference: existing.data.reference, duplicate: true });
    }
    if (process.env.TURNSTILE_SECRET_KEY) {
      let challengeResult: { success?: boolean; hostname?: string };
      try {
        challengeResult = await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            body: new URLSearchParams({
              secret: process.env.TURNSTILE_SECRET_KEY,
              response: challenge || '',
            }),
            signal: AbortSignal.timeout(10000),
          },
        ).then((r) => r.json());
      } catch {
        return NextResponse.json(
          { error: 'Anti-spam verification unavailable. Please retry.' },
          { status: 503 },
        );
      }
      if (!challengeResult.success || challengeResult.hostname !== new URL(request.url).hostname)
        return NextResponse.json({ error: 'Please complete the anti-spam check' }, { status: 400 });
    }
    let attachment = null;
    if (fileBytes) {
      const image = await sanitizeImage(fileBytes);
      uploaded = `${project.organization_id}/${crypto.randomUUID()}.${image.extension}`;
      const result = await db.storage
        .from('screenshots')
        .upload(uploaded, image.data, { contentType: image.mime, upsert: false });
      if (result.error) throw new Error('Screenshot storage unavailable');
      attachment = { path: uploaded, mime: image.mime, size: image.data.length };
    }
    const result = await db.rpc('submit_report', {
      p_project: project.id,
      p_key: key,
      p_hash: payloadHash,
      p_data: data,
      p_attachment: attachment,
    });
    if (result.error) {
      const limit = result.error.message.includes('Monthly report limit');
      return NextResponse.json(
        {
          error: limit
            ? 'This workspace has reached its monthly report limit.'
            : 'Could not save the report. Please retry with the same request.',
        },
        { status: limit ? 429 : 400 },
      );
    }
    if (!result.data) throw new Error('Submission receipt unavailable');
    committed = !result.data.duplicate;
    return NextResponse.json(
      { reference: result.data.reference, duplicate: result.data.duplicate },
      { status: result.data.duplicate ? 200 : 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      {
        error: message.includes('5 MB')
          ? 'Screenshot must be at most 5 MB.'
          : message === 'Payload too large'
            ? 'Request is too large.'
            : message.includes('token')
              ? 'Your form session expired. Close and reopen the widget.'
              : 'Unable to submit. Check the form and try again.',
      },
      { status: message === 'Payload too large' ? 413 : 400 },
    );
  } finally {
    if (uploaded && !committed) {
      try {
        const db = adminClient();
        const attached = await db
          .from('report_attachments')
          .select('id')
          .eq('object_path', uploaded)
          .maybeSingle();
        if (!attached.error && !attached.data)
          await db.storage.from('screenshots').remove([uploaded]);
      } catch {
        /* Scheduled orphan cleanup retries. Never remove a possibly committed attachment. */
      }
    }
  }
}
