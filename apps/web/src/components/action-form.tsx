'use client';
import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@bugsnap/ui';
import { Copy, Check } from 'lucide-react';
import type { ActionState } from '@/app/actions';
export function ActionForm({
  action,
  children,
  submit = 'Save changes',
  className = 'form-stack',
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (state.redirect) {
      router.push(state.redirect);
      router.refresh();
    }
  }, [state, router]);
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice success" role="status">
          {state.success}
        </p>
      )}
      {state.link && (
        <div className="invite-link-box" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            aria-label="Invitation link"
            className="input"
            value={state.link}
            readOnly
            onFocus={(e) => e.target.select()}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="button button-outline button-sm"
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.link!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <Button disabled={pending} type="submit">
        {pending ? 'Saving…' : submit}
      </Button>
    </form>
  );
}
