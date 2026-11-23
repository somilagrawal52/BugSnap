import Link from 'next/link';
import { Search } from 'lucide-react';
import { statuses, priorities, label } from '@bugsnap/shared';
import { workspace, assertResult } from '@/lib/workspace';
import { PageHeading } from '@/components/page-heading';
import { ReportsTable } from '@/components/reports-table';
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const s = await searchParams;
  const { db, org } = await workspace();
  const page = Math.max(1, Math.min(100000, Number(s.page) || 1));
  let query = db
    .from('reports')
    .select('*,projects(name),assignee:assignee_id(display_name)', { count: 'exact' })
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });
  const search = (s.q || '').replace(/[^\p{L}\p{N}\s-]/gu, '').slice(0, 120);
  if (search)
    query = query.or(
      `reference.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`,
    );
  const status = statuses.find((v) => v === s.status);
  if (status) query = query.eq('status', status);
  const priority = priorities.find((v) => v === s.priority);
  if (priority) query = query.eq('priority', priority);
  if (s.project && /^[a-f0-9-]{36}$/.test(s.project)) query = query.eq('project_id', s.project);
  if (s.assignee === 'unassigned') query = query.is('assignee_id', null);
  else if (s.assignee && /^[a-f0-9-]{36}$/.test(s.assignee))
    query = query.eq('assignee_id', s.assignee);
  if (s.from && /^\d{4}-\d{2}-\d{2}$/.test(s.from)) query = query.gte('created_at', s.from);
  if (s.to && /^\d{4}-\d{2}-\d{2}$/.test(s.to))
    query = query.lte('created_at', s.to + 'T23:59:59.999Z');
  const [result, projects, members] = await Promise.all([
    query.range((page - 1) * 20, page * 20 - 1),
    db.from('projects').select('id,name').eq('organization_id', org.id),
    db
      .from('organization_members')
      .select('user_id,profiles(display_name)')
      .eq('organization_id', org.id)
      .eq('active', true),
  ]);
  [result, projects, members].forEach(assertResult);
  const pageHref = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(s).filter((e): e is [string, string] => e[1] !== undefined),
    );
    params.set('page', String(p));
    return '/dashboard/reports?' + params;
  };
  return (
    <>
      <PageHeading
        eyebrow="THE TEAM’S BUG INBOX"
        title="All reports"
        description="Everything you need to move from reported to resolved."
      />
      <form className="filter-bar">
        <div className="search-input">
          <Search size={17} />
          <input
            name="q"
            aria-label="Search reports"
            placeholder="Search reports…"
            defaultValue={s.q}
          />
        </div>
        <select name="project" defaultValue={s.project} aria-label="Project">
          <option value="">All projects</option>
          {projects.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={s.status} aria-label="Status">
          <option value="">All statuses</option>
          {statuses.map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={s.priority} aria-label="Priority">
          <option value="">All priorities</option>
          {priorities.map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
        <select name="assignee" defaultValue={s.assignee} aria-label="Assignee">
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.data?.map((m: any) => (
            <option key={m.user_id} value={m.user_id}>
              {m.profiles.display_name || m.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
        <label className="date-filter">
          From
          <input type="date" name="from" defaultValue={s.from} />
        </label>
        <label className="date-filter">
          To
          <input type="date" name="to" defaultValue={s.to} />
        </label>
        <button className="button button-outline button-sm">Apply</button>
        <Link href="/dashboard/reports" className="small">
          Reset
        </Link>
      </form>
      <section className="panel">
        <ReportsTable reports={result.data as any} />
        <div className="pagination">
          <span>
            {result.count || 0} reports · Page {page} of{' '}
            {Math.max(1, Math.ceil((result.count || 0) / 20))}
          </span>
          <span>
            {page > 1 && (
              <Link className="button button-outline button-sm" href={pageHref(page - 1)}>
                Previous
              </Link>
            )}
            {page * 20 < (result.count || 0) && (
              <Link className="button button-outline button-sm" href={pageHref(page + 1)}>
                Next
              </Link>
            )}
          </span>
        </div>
      </section>
    </>
  );
}
