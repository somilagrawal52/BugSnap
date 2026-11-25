import Link from 'next/link';
import { Download, Search } from 'lucide-react';
import { statuses, priorities, label } from '@bugsnap/shared';
import { workspace, assertResult } from '@/lib/workspace';
import { applyReportFilters, parseReportFilters, sortOptions } from '@/lib/reports-query';
import { PageHeading } from '@/components/page-heading';
import { ReportsTable } from '@/components/reports-table';

const sortLabels: Record<(typeof sortOptions)[number], string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  priority: 'Highest priority',
  updated: 'Recently updated',
};

export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const s = await searchParams;
  const { db, org } = await workspace();
  const filters = parseReportFilters(s);
  const page = filters.page;

  const base = db
    .from('reports')
    .select('*,projects(name),assignee:assignee_id(display_name)', { count: 'exact' })
    .eq('organization_id', org.id);

  const query = applyReportFilters(base, filters);

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

  const buildParams = (overrides: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...s, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return params;
  };

  const pageHref = (p: number) => '/dashboard/reports?' + buildParams({ page: String(p) });
  const statusHref = (nextStatus?: string) =>
    '/dashboard/reports?' + buildParams({ status: nextStatus, page: undefined });
  const exportHref = '/api/reports/export?' + buildParams({ page: undefined });

  return (
    <>
      <PageHeading
        eyebrow="THE TEAM’S BUG INBOX"
        title="All reports"
        description="Everything you need to move from reported to resolved."
      >
        <a className="button button-outline" href={exportHref}>
          <Download size={15} />
          Export CSV
        </a>
      </PageHeading>
      <nav className="status-tabs" aria-label="Quick status filter">
        <Link className={`status-tab ${!filters.status ? 'active' : ''}`} href={statusHref(undefined)}>
          All
        </Link>
        {statuses.map((st) => (
          <Link
            key={st}
            className={`status-tab ${filters.status === st ? 'active' : ''}`}
            href={statusHref(st)}
          >
            {label(st)}
          </Link>
        ))}
      </nav>
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
        <select name="project" defaultValue={filters.project || ''} aria-label="Project">
          <option value="">All projects</option>
          {projects.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status || ''} aria-label="Status">
          <option value="">All statuses</option>
          {statuses.map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={filters.priority || ''} aria-label="Priority">
          <option value="">All priorities</option>
          {priorities.map((v) => (
            <option key={v} value={v}>
              {label(v)}
            </option>
          ))}
        </select>
        <select name="assignee" defaultValue={filters.assignee || ''} aria-label="Assignee">
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.data?.map((m: any) => (
            <option key={m.user_id} value={m.user_id}>
              {m.profiles?.display_name || m.user_id.slice(0, 8)}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={filters.sort} aria-label="Sort order">
          {sortOptions.map((opt) => (
            <option key={opt} value={opt}>
              {sortLabels[opt]}
            </option>
          ))}
        </select>
        <label className="date-filter">
          From
          <input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className="date-filter">
          To
          <input type="date" name="to" defaultValue={filters.to} />
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
