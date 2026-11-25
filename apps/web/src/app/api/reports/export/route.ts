import { cookies } from 'next/headers';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { configured } from '@/lib/env';
import { applyReportFilters, parseReportFilters } from '@/lib/reports-query';
import { reportsToCsv, type ExportableReport } from '@/lib/report-export';

export async function GET(request: Request) {
  if (!configured()) return new Response('Not configured', { status: 503 });
  const db = await sessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const memberships = await db
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('created_at');
  if (memberships.error || !memberships.data?.length)
    return new Response('Forbidden', { status: 403 });

  const selected = (await cookies()).get('bugsnap_workspace')?.value;
  const orgId =
    memberships.data.find((m) => m.organization_id === selected)?.organization_id ||
    memberships.data[0].organization_id;

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const filters = parseReportFilters(raw);

  const base = db
    .from('reports')
    .select('*,projects(name),assignee:assignee_id(display_name)')
    .eq('organization_id', orgId);

  const result = await applyReportFilters(base, filters).limit(2000);
  if (result.error) return new Response('Unable to export reports', { status: 500 });

  const csv = reportsToCsv((result.data || []) as unknown as ExportableReport[]);
  const safeOrg = z.uuid().safeParse(orgId).success ? orgId.slice(0, 8) : 'workspace';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bugsnap-${safeOrg}-reports.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
