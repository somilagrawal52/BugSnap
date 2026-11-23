import Link from 'next/link';
import {
  Inbox,
  Clock3,
  CheckCircle2,
  CalendarDays,
  Plus,
  Activity,
  FolderKanban,
  ChevronRight,
} from 'lucide-react';
import { workspace, assertResult } from '@/lib/workspace';
import { PageHeading } from '@/components/page-heading';
import { ReportsChart } from '@/components/charts';
import { ReportsTable } from '@/components/reports-table';
import { label } from '@bugsnap/shared';
export default async function Overview() {
  const { db, org, user } = await workspace();
  const [metrics, recent, projects] = await Promise.all([
    db.rpc('workspace_metrics', { p_org: org.id }),
    db
      .from('reports')
      .select('*,projects(name),assignee:assignee_id(display_name)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(6),
    db.from('projects').select('*').eq('organization_id', org.id).order('created_at').limit(3),
  ]);
  [metrics, recent, projects].forEach(assertResult);
  const m = metrics.data;
  const cards = [
    {
      title: 'Total reports',
      value: m.total,
      icon: Inbox,
      caption: 'Across all your projects',
      color: 'violet',
    },
    {
      title: 'New reports',
      value: m.new,
      icon: Clock3,
      caption: 'Ready for a closer look',
      color: 'blue',
    },
    {
      title: 'In progress',
      value: m.in_progress,
      icon: Activity,
      caption: 'Your team is on it',
      color: 'amber',
    },
    {
      title: 'Resolved',
      value: m.resolved,
      icon: CheckCircle2,
      caption: 'One less bug in the world',
      color: 'green',
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE AT A GLANCE"
        title={`Hey ${user.user_metadata.display_name?.split(' ')[0] || 'there'}, let’s clear the inbox.`}
        description="A little context makes every fix a little faster."
      >
        <Link className="button button-primary" href="/dashboard/projects">
          <Plus size={16} />
          Install a widget
        </Link>
      </PageHeading>
      <div className="metric-grid">
        {cards.map((c) => (
          <article key={c.title} className="metric-card">
            <div className="metric-label">
              {c.title}
              <span className={`metric-icon ${c.color}`}>
                <c.icon size={18} />
              </span>
            </div>
            <strong>{c.value.toLocaleString()}</strong>
            <span className="metric-caption">{c.caption}</span>
          </article>
        ))}
      </div>
      <div className="overview-middle">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Report activity</h2>
              <p>See what’s coming in, day by day.</p>
            </div>
            <span className="date-chip">
              <CalendarDays size={14} />
              Last 14 days · UTC
            </span>
          </div>
          <ReportsChart data={m.trend} />
          <div className="chart-caption">
            <span className="legend-dot" />
            {m.week} reports received this week
          </div>
        </section>
        <section className="panel priority-panel">
          <div className="panel-heading">
            <div>
              <h2>By priority</h2>
              <p>Focus on what matters most.</p>
            </div>
          </div>
          <div className="priority-summary">
            <strong>{m.total}</strong>
            <span>total reports</span>
          </div>
          <div className="priority-breakdown">
            {['critical', 'high', 'medium', 'low'].map((p) => {
              const value = m.priorities.find((x: any) => x.name === p)?.value || 0;
              return (
                <div className="priority-breakdown-row" key={p}>
                  <span className={`priority-dot ${p}`} />
                  <span>{label(p)}</span>
                  <div className="priority-track">
                    <i
                      className={p}
                      style={{ width: `${m.total ? (value / m.total) * 100 : 0}%` }}
                    />
                  </div>
                  <strong>{value}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h2>
              Latest reports <span className="count-pill">{m.total}</span>
            </h2>
            <p>The latest context from your users.</p>
          </div>
          <Link className="text-link" href="/dashboard/reports">
            View all reports
            <ChevronRight size={15} />
          </Link>
        </div>
        <ReportsTable reports={recent.data as any} />
      </section>
      <div className="section-title">
        <h2>Your projects</h2>
        <Link href="/dashboard/projects" className="text-link">
          Manage projects
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="project-grid">
        {projects.data?.map((p) => (
          <Link href={`/dashboard/projects/${p.id}`} className="project-card" key={p.id}>
            <span className="project-card-icon">
              <FolderKanban size={20} />
            </span>
            <div>
              <h3>{p.name}</h3>
              <p>
                {p.environment} <span>·</span> {p.enabled ? 'Widget enabled' : 'Widget paused'}
              </p>
            </div>
            <ChevronRight size={17} />
          </Link>
        ))}
        <Link href="/dashboard/projects/new" className="new-project-card">
          <Plus size={19} />
          Create a project
        </Link>
      </div>
    </>
  );
}
