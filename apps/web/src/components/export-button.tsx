'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@bugsnap/ui';
import { GitFork as Github } from 'lucide-react';
export function ExportButton({
  reportId,
  repositories,
}: {
  reportId: string;
  repositories: { id: string; full_name: string }[];
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const router = useRouter();
  if (!repositories.length) return null;
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        const data = new FormData(e.currentTarget);
        try {
          const r = await fetch(`/api/github/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId, repositoryId: data.get('repository') }),
          });
          const result = await r.json();
          setMessage(result.message || result.error || 'Export updated');
          router.refresh();
        } catch {
          setMessage(
            'Connection interrupted. Retry to check the existing export before creating another issue.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <select name="repository" aria-label="GitHub repository">
        {repositories.map((r) => (
          <option key={r.id} value={r.id}>
            {r.full_name}
          </option>
        ))}
      </select>
      <Button disabled={busy}>
        <Github size={16} />
        {busy ? 'Checking export…' : 'Export to GitHub'}
      </Button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
