import { notFound } from 'next/navigation';
import Link from 'next/link';
import { workspace } from '@/lib/workspace';
import { appUrl } from '@/lib/env';
import { PageHeading } from '@/components/page-heading';
import { ProjectForm } from '@/components/project-form';
import { CopyCode } from '@/components/copy-code';
export default async function ProjectSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, org, role } = await workspace();
  const { data: p } = await db
    .from('projects')
    .select('*,project_domains(origin),widget_settings(*)')
    .eq('organization_id', org.id)
    .eq('id', id)
    .single();
  if (!p) notFound();
  const settings = Array.isArray(p.widget_settings) ? p.widget_settings[0] : p.widget_settings;
  return (
    <>
      <Link href="/dashboard/projects" className="back-link">
        All projects
      </Link>
      <PageHeading title={p.name} description="Everything your widget needs to feel at home." />
      <section className="panel settings-panel">
        <p className="eyebrow">INSTALLATION</p>
        <h2>Your next report is one snippet away.</h2>
        <p className="muted">
          Paste this before the closing body tag on your authorized website. The project key is
          public; it does not grant access to your reports.
        </p>
        <CopyCode
          code={`<script src="${appUrl()}/widget.js"\n  data-project-key="${p.public_key}" async></script>`}
        />
        <div className="inline-actions">
          <Link href={`/demo?key=${p.public_key}`} className="button button-outline">
            Open widget test page
          </Link>
          <Link href="/docs#installation">Framework installation guide</Link>
        </div>
        <p className="field-hint">
          The test page must also match the authorized origin. To test locally, use a development
          project authorized for http://localhost:3000.
        </p>
      </section>
      <section className="panel settings-panel">
        <h2>Project settings</h2>
        {role === 'member' ? (
          <p>Ask an owner or admin to update this project.</p>
        ) : (
          <ProjectForm project={p} domain={p.project_domains.map((d:{origin:string})=>d.origin).join('\n')} settings={settings} />
        )}
      </section>
    </>
  );
}
