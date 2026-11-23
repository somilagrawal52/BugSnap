import Link from 'next/link';
import { FolderKanban, Plus, Code2 } from 'lucide-react';
import { workspace, assertResult } from '@/lib/workspace';
import { PageHeading } from '@/components/page-heading';
import { Badge } from '@bugsnap/ui';
export default async function Projects() {
  const { db, org, role } = await workspace();
  const result = await db
    .from('projects')
    .select('*,project_domains(origin)')
    .eq('organization_id', org.id)
    .order('created_at');
  assertResult(result);
  return (
    <>
      <PageHeading
        eyebrow="CONNECTED TO YOUR PRODUCT"
        title="Projects"
        description="Give every application its own inbox and widget."
      >
        {role !== 'member' && (
          <Link className="button button-primary" href="/dashboard/projects/new">
            <Plus size={16} />
            New project
          </Link>
        )}
      </PageHeading>
      <div className="projects-list">
        {result.data?.map((p) => (
          <article className="panel project-list-card" key={p.id}>
            <span className="project-card-icon">
              <FolderKanban size={23} />
            </span>
            <div>
              <h2>
                <Link href={`/dashboard/projects/${p.id}`}>{p.name}</Link>
              </h2>
              <p className="muted">{p.project_domains.map((d: any) => d.origin).join(', ')}</p>
              <Badge>{p.environment}</Badge>{' '}
              <Badge className={p.enabled ? 'status-resolved' : 'status-closed'}>
                {p.enabled ? 'Enabled' : 'Paused'}
              </Badge>
            </div>
            <Link className="button button-outline button-sm" href={`/dashboard/projects/${p.id}`}>
              <Code2 size={16} />
              Setup & settings
            </Link>
          </article>
        ))}
      </div>
      {!result.data?.length && (
        <div className="empty-state">
          <FolderKanban size={32} />
          <h2>Give your bugs a place to land.</h2>
          <p>Create your first project, install the snippet, and start collecting context.</p>
          <Link className="button button-primary" href="/dashboard/projects/new">
            Create your first project
          </Link>
        </div>
      )}
    </>
  );
}
