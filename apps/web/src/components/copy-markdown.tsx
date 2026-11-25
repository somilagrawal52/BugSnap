'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyMarkdown({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="button button-outline button-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? 'Copied Markdown' : 'Copy as Markdown'}
    </button>
  );
}
