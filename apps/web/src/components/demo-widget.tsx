'use client';
import Script from 'next/script';
import { useState } from 'react';
import { Bug } from 'lucide-react';
declare global {
  interface Window {
    BugSnap?: {
      init: (config: {
        projectKey: string;
        appOrigin: string;
        label?: string;
        position?: 'bottom-left' | 'bottom-right';
        accent?: string;
      }) => Promise<void>;
      open: () => void;
      close: () => void;
      destroy: () => void;
    };
  }
}
export function DemoWidget({ projectKey }: { projectKey?: string }) {
  const [state, setState] = useState('');
  return (
    <>
      <button
        className="button button-primary"
        onClick={() => {
          if (projectKey && window.BugSnap) {
            window.BugSnap.open();
            setState(
              'If the widget doesn’t open, verify this page’s origin is authorized in project settings.',
            );
          } else
            setState(
              'Configure a development project and open its widget test link from Project settings to send a real report.',
            );
        }}
      >
        <Bug size={17} />
        Try reporting a bug
      </button>
      {state && (
        <p className="notice" role="status">
          {state}
        </p>
      )}
      {projectKey && (
        <Script
          src="/widget.js"
          data-project-key={projectKey}
          strategy="afterInteractive"
          onLoad={() => setState('Widget loaded. Look for the feedback button in the corner.')}
          onError={() =>
            setState('Widget failed to load. Check your connection and project settings.')
          }
        />
      )}
    </>
  );
}
