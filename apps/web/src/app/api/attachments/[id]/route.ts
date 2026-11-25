import { z } from 'zod';
import { sessionClient, adminClient } from '@/lib/supabase/server';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { data } = await db
    .from('report_attachments')
    .select('object_path,mime_type')
    .eq('id', id)
    .single();
  if (!data) return new Response('Not found', { status: 404 });
  const file = await adminClient().storage.from('screenshots').download(data.object_path);
  if (file.error) return new Response('Unavailable', { status: 404 });
  return new Response(file.data, {
    headers: {
      'Content-Type': data.mime_type,
      'Content-Disposition': 'inline; filename="screenshot.webp"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
