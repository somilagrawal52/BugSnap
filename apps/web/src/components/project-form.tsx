import { ActionForm } from './action-form';
import { saveProject } from '@/app/actions';
export function ProjectForm({
  project,
  domain,
  settings,
}: {
  project?: any;
  domain?: string;
  settings?: any;
}) {
  return (
    <ActionForm
      action={saveProject.bind(null, project?.id || null)}
      submit={project ? 'Save project' : 'Create project'}
    >
      <div className="form-grid">
        <label>
          Project name
          <input
            className="input"
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={project?.name}
            placeholder="Acme Dashboard"
          />
        </label>
        <label>
          Slug
          <input
            className="input"
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9-]{1,49}"
            defaultValue={project?.slug}
            placeholder="acme-dashboard"
          />
          <span className="field-hint">Lowercase letters, numbers, and hyphens.</span>
        </label>
      </div>
      <div className="form-grid">
        <label>
          Environment
          <select name="environment" defaultValue={project?.environment || 'production'}>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </label>
        <label>
          Authorized origins
          <textarea
            name="origin"
            className="input"
            required
            defaultValue={domain}
            placeholder="https://app.example.com"
          />
          <span className="field-hint">
            One exact scheme + hostname + port per line (up to 10). Localhost is allowed in development.
          </span>
        </label>
      </div>
      <h3>Widget appearance</h3>
      <div className="form-grid">
        <label>
          Button label
          <input
            className="input"
            name="label"
            required
            maxLength={40}
            defaultValue={settings?.label || 'Report a bug'}
          />
        </label>
        <label>
          Accent color
          <input
            className="input"
            name="accent"
            pattern="#[a-fA-F0-9]{6}"
            defaultValue={settings?.accent || '#6554e8'}
            required
          />
        </label>
        <label>
          Position
          <select name="position" defaultValue={settings?.position || 'bottom-right'}>
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
          </select>
        </label>
        <label>
          Application version (optional)
          <input
            className="input"
            name="appVersion"
            maxLength={80}
            defaultValue={settings?.app_version || ''}
            placeholder="e.g. 1.4.2"
          />
        </label>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" name="enabled" defaultChecked={project?.enabled ?? true} />
        Widget enabled
      </label>
      {project && (
        <label className="checkbox-label">
          <input type="checkbox" name="rotate" />
          Rotate public key when saving. Existing installations will need the new snippet.
        </label>
      )}
    </ActionForm>
  );
}
