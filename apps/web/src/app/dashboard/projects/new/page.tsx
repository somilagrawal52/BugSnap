import Link from 'next/link';
import { plans } from '@bugsnap/shared';
import { workspace, assertResult } from '@/lib/workspace';
import { PageHeading } from '@/components/page-heading';
import { ProjectForm } from '@/components/project-form';

export default async function NewProject() {
  const { db, org, role } = await workspace();
  const projects = await db
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', org.id);
  assertResult(projects);
  const used = projects.count || 0;
  const max = plans[org.plan].projects;
  const atLimit = used >= max;

  return (
    <>
      <PageHeading
        title="Create a project"
        description="One small snippet. A much clearer picture of every bug."
      />
      <section className="panel settings-panel">
        {role === 'member' ? (
          <p>An owner or admin can create projects.</p>
        ) : atLimit ? (
          <div className="form-stack">
            <p className="notice error">
              Your {org.plan} plan allows up to {max} {max === 1 ? 'project' : 'projects'} ({used} /{' '}
              {max} used).
            </p>
            <div className="inline-actions">
              <Link className="button button-outline" href="/dashboard/projects">
                Back to projects
              </Link>
              <Link className="button button-outline" href="/dashboard/usage">
                View usage & limits
              </Link>
            </div>
          </div>
        ) : (
          <ProjectForm />
        )}
      </section>
    </>
  );
}
