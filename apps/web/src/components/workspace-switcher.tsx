'use client';
import { useRef } from 'react';
import { switchWorkspace } from '@/app/actions';

export function WorkspaceSwitcher({
  currentOrgId,
  currentOrgName,
  memberships,
}: {
  currentOrgId: string;
  currentOrgName: string;
  memberships: { organization_id: string; organizations: { name: string } | null }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={switchWorkspace} className="workspace-switch">
      <span className="workspace-avatar">{currentOrgName.slice(0, 1).toUpperCase()}</span>
      <label className="sr-only" htmlFor="workspace">
        Workspace
      </label>
      <select
        id="workspace"
        name="organization"
        defaultValue={currentOrgId}
        aria-label="Workspace"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {memberships.map((m) => (
          <option key={m.organization_id} value={m.organization_id}>
            {m.organizations?.name || 'Workspace'}
          </option>
        ))}
      </select>
      {memberships.length > 1 && (
        <button type="submit" className="switch-button">
          Go
        </button>
      )}
    </form>
  );
}
