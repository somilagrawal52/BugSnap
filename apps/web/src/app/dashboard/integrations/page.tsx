import { GitFork as Github, PlugZap } from 'lucide-react';
import { workspace, assertResult } from '@/lib/workspace';
import { githubConfigured } from '@/lib/env';
import { PageHeading } from '@/components/page-heading';
import { ActionForm } from '@/components/action-form';
import { selectRepository } from '@/app/actions';
export default async function Integrations({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const s = await searchParams;
  const { db, org, role } = await workspace();
  const [installations, repositories] = await Promise.all([
    db.from('github_installations').select('*').eq('organization_id', org.id),
    db.from('github_repositories').select('*').eq('organization_id', org.id).eq('enabled', true),
  ]);
  [installations, repositories].forEach(assertResult);
  return (
    <>
      <PageHeading
        title="Context, meet your workflow."
        description="Turn a report into an actionable GitHub issue without the copy and paste."
      />
      {s.error && (
        <p className="notice error">
          GitHub connection could not be completed. Check App credentials, callback URLs, and
          installation authorization.
        </p>
      )}
      {s.connected && (
        <p className="notice success">
          GitHub installation connected. Choose the repositories your team can export to.
        </p>
      )}
      <section className="panel settings-panel">
        <span className="integration-icon">
          <Github size={32} />
        </span>
        <h2>GitHub Issues</h2>
        <p className="muted">
          Export descriptions, reproduction steps and technical context. Screenshots remain private
          behind BugSnap authentication.
        </p>
        {!githubConfigured() ? (
          <p className="notice">
            GitHub App credentials haven’t been configured. Follow the GitHub App setup in the
            documentation to enable connection.
          </p>
        ) : role !== 'member' ? (
          <a className="button button-primary" href="/api/github/connect">
            <PlugZap size={16} />
            Connect GitHub
          </a>
        ) : (
          <p>Ask a workspace owner or admin to connect GitHub.</p>
        )}
        {installations.data?.map((i) => (
          <div className="installation" key={i.id}>
            <Github size={20} />
            <strong>{i.account_login}</strong>
            <span>{i.suspended ? 'Access suspended or removed' : 'Connected'}</span>
          </div>
        ))}
      </section>
      {!!repositories.data?.length && (
        <section className="panel settings-panel">
          <h2>Allowed repositories</h2>
          <p className="muted">
            Repository access updates automatically from verified GitHub webhooks.
          </p>
          {repositories.data.map((r) => (
            <div className="repository-row" key={r.id}>
              <strong>{r.full_name}</strong>
              {role === 'member' ? (
                <span>{r.selected ? 'Enabled for exports' : 'Not selected'}</span>
              ) : (
                <ActionForm
                  action={selectRepository.bind(null, r.id)}
                  submit="Save"
                  className="inline-form"
                >
                  <label className="checkbox-label">
                    <input type="checkbox" name="selected" defaultChecked={r.selected} />
                    Allow exports
                  </label>
                </ActionForm>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
