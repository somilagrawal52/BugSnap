'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState(false);
  return (
    <div className="code-block">
      <pre>
        <code>{code}</code>
      </pre>
      <button
        aria-label="Copy installation snippet"
        className="copy-button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      {error && <p className="small">Select the snippet and copy it manually.</p>}
    </div>
  );
}
