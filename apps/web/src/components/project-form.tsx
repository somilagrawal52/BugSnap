'use client';
import { useState } from 'react';
import { slugify } from '@bugsnap/shared';
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
  const [slug, setSlug] = useState<string>(project?.slug || '');
  const [slugEdited, setSlugEdited] = useState<boolean>(!!project?.slug);
  const [labelText, setLabelText] = useState<string>(settings?.label || 'Report a bug');
  const [accent, setAccent] = useState<string>(settings?.accent || '#6554e8');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>(
    settings?.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
  );

  const validHex = /^#[a-fA-F0-9]{6}$/.test(accent) ? accent : '#6554e8';

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
            onChange={(e) => {
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
          />
        </label>
        <label>
          Slug
          <input
            className="input"
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9-]{1,49}"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value);
            }}
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
            One exact scheme + hostname + port per line (up to 10). Localhost is allowed in
            development.
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
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
          />
        </label>
        <label>
          Accent color
          <div className="color-field">
            <input
              type="color"
              aria-label="Pick accent color"
              className="color-swatch"
              value={validHex}
              onChange={(e) => setAccent(e.target.value)}
            />
            <input
              className="input"
              name="accent"
              pattern="#[a-fA-F0-9]{6}"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              required
            />
          </div>
        </label>
        <label>
          Position
          <select
            name="position"
            value={position}
            onChange={(e) =>
              setPosition(e.target.value === 'bottom-left' ? 'bottom-left' : 'bottom-right')
            }
          >
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
      <div className="launcher-preview-box" aria-label="Widget launcher preview">
        <span className="field-hint">Launcher preview ({position.replace('-', ' ')})</span>
        <div
          className={`launcher-preview-stage ${position === 'bottom-left' ? 'left' : 'right'}`}
        >
          <span className="launcher-preview-pill" style={{ backgroundColor: validHex }}>
            {labelText.trim() || 'Report a bug'}
          </span>
        </div>
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
